package br.com.academia;

import br.com.academia.assessment.AssessmentService;
import br.com.academia.billing.InvoiceService;
import br.com.academia.plan.PlanService;
import br.com.academia.shared.ApiException;
import br.com.academia.student.StudentService;
import br.com.academia.teacher.TeacherService;
import br.com.academia.workout.WorkoutService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;

@Timeout(40)
class ConcurrencyTest extends IntegrationSupport {
    @Autowired PlanService plans;
    @Autowired StudentService students;
    @Autowired TeacherService teachers;
    @Autowired InvoiceService invoices;
    @Autowired WorkoutService workouts;
    @Autowired AssessmentService assessments;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void simultaneousInvoiceRequestsReturnTheSameCommittedInvoice() throws Exception {
        long studentId = newStudent(newPlan());
        var request = new InvoiceService.Request(studentId, "2026-01", LocalDate.of(2026, 1, 10));

        var result = race(() -> invoices.create(request).id(), () -> invoices.create(request).id());

        assertNull(result.contender().failure());
        assertEquals(result.firstId(), result.contender().id());
        assertEquals(1L, count("select count(*) from invoices where student_id=?", studentId));
        assertEquals(new BigDecimal("149.90"), jdbc.queryForObject(
                "select amount from invoices where student_id=?", BigDecimal.class, studentId));
    }

    @Test
    void teacherArchiveCommitsBeforeACompetingWorkoutCanAssociateIt() throws Exception {
        long studentId = newStudent(newPlan());
        long teacherId = newTeacher();
        var request = workout(studentId, teacherId);

        var result = race(() -> { teachers.archive(teacherId); return teacherId; },
                () -> workouts.create(request).id());

        assertEquals(HttpStatus.CONFLICT, result.contender().failure());
        assertFalse(jdbc.queryForObject("select active from teachers where id=?", Boolean.class, teacherId));
        assertEquals(0L, count("select count(*) from workouts where teacher_id=?", teacherId));
    }

    @Test
    void studentArchiveCommitsBeforeACompetingWorkoutCanAssociateIt() throws Exception {
        long studentId = newStudent(newPlan());
        var request = workout(studentId, newTeacher());

        var result = race(() -> { students.archive(studentId); return studentId; },
                () -> workouts.create(request).id());

        assertEquals(HttpStatus.CONFLICT, result.contender().failure());
        assertFalse(jdbc.queryForObject("select active from students where id=?", Boolean.class, studentId));
        assertEquals(0L, count("select count(*) from workouts where student_id=?", studentId));
    }

    @Test
    void studentArchiveCommitsBeforeACompetingAssessmentCanAssociateIt() throws Exception {
        long studentId = newStudent(newPlan());
        var request = new AssessmentService.Request(studentId, LocalDate.of(2026, 1, 2),
                new BigDecimal("80"), new BigDecimal("180"), null, null, null, "", null);

        var result = race(() -> { students.archive(studentId); return studentId; },
                () -> assessments.create(request).id());

        assertEquals(HttpStatus.CONFLICT, result.contender().failure());
        assertEquals(0L, count("select count(*) from assessments where student_id=?", studentId));
    }

    @Test
    void studentArchiveCommitsBeforeACompetingInvoiceCanBeIssued() throws Exception {
        long studentId = newStudent(newPlan());
        var request = new InvoiceService.Request(studentId, "2026-01", LocalDate.of(2026, 1, 10));

        var result = race(() -> { students.archive(studentId); return studentId; },
                () -> invoices.create(request).id());

        assertEquals(HttpStatus.CONFLICT, result.contender().failure());
        assertEquals(0L, count("select count(*) from invoices where student_id=?", studentId));
    }

    @Test
    void planArchiveCommitsBeforeACompetingStudentCanAssociateIt() throws Exception {
        long planId = newPlan();
        var request = student(planId);

        var result = race(() -> { plans.archive(planId); return planId; },
                () -> students.create(request).id());

        assertEquals(HttpStatus.CONFLICT, result.contender().failure());
        assertFalse(jdbc.queryForObject("select active from plans where id=?", Boolean.class, planId));
        assertEquals(0L, count("select count(*) from students where plan_id=?", planId));
    }

    private long newPlan() {
        return plans.create(new PlanService.Request("Plano concorrente " + UUID.randomUUID(),
                new BigDecimal("149.90"), 1, "Acesso", true, null)).id();
    }

    private long newStudent(long planId) {
        return students.create(student(planId)).id();
    }

    private StudentService.Request student(long planId) {
        return new StudentService.Request("Aluno concorrente " + UUID.randomUUID(),
                UUID.randomUUID() + "@example.test", "11999998888", LocalDate.of(2000, 1, 1),
                LocalDate.of(2025, 1, 1), planId, true, null);
    }

    private long newTeacher() {
        return teachers.create(new TeacherService.Request("Professor concorrente " + UUID.randomUUID(),
                UUID.randomUUID() + "@example.test", "11977778888", "Força",
                "C-" + UUID.randomUUID(), true, null)).id();
    }

    private WorkoutService.Request workout(long studentId, long teacherId) {
        var exercise = new WorkoutService.ExerciseRequest("Agachamento", 3, "12",
                new BigDecimal("20"), 60, "");
        return new WorkoutService.Request("Ficha concorrente", studentId, teacherId,
                LocalDate.of(2026, 1, 1), "", List.of(exercise), null);
    }

    private long count(String query, long id) {
        return jdbc.queryForObject(query, Long.class, id);
    }

    private record Outcome(Long id, HttpStatus failure) {}
    private record RaceResult(Long firstId, Outcome contender) {}

    /** The first service call has flushed, but its surrounding transaction has not committed. */
    private RaceResult race(Supplier<Long> firstOperation, Supplier<Long> competingOperation) throws Exception {
        var firstFlushed = new CountDownLatch(1);
        var releaseFirstCommit = new CountDownLatch(1);
        var contenderConnected = new CountDownLatch(1);
        var contenderPid = new AtomicInteger();
        var executor = Executors.newFixedThreadPool(2);
        Future<Long> first = null;
        Future<Outcome> contender = null;
        try {
            first = executor.submit(() -> transaction().execute(status -> {
                setDatabaseTimeouts();
                Long id = firstOperation.get();
                firstFlushed.countDown();
                awaitCommitPermission(releaseFirstCommit);
                return id;
            }));
            assertTrue(firstFlushed.await(5, TimeUnit.SECONDS), "First operation did not flush");

            contender = executor.submit(() -> {
                try {
                    Long id = transaction().execute(status -> {
                        setDatabaseTimeouts();
                        contenderPid.set(jdbc.queryForObject("select pg_backend_pid()", Integer.class));
                        contenderConnected.countDown();
                        return competingOperation.get();
                    });
                    return new Outcome(id, null);
                } catch (ApiException conflict) {
                    return new Outcome(null, conflict.status);
                }
            });
            assertTrue(contenderConnected.await(5, TimeUnit.SECONDS), "Contender did not obtain a database connection");
            awaitDatabaseLockOrCompletion(contenderPid.get(), contender);
            releaseFirstCommit.countDown();
            return new RaceResult(first.get(10, TimeUnit.SECONDS), contender.get(10, TimeUnit.SECONDS));
        } finally {
            releaseFirstCommit.countDown();
            if (first != null && !first.isDone()) first.cancel(true);
            if (contender != null && !contender.isDone()) contender.cancel(true);
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS), "Concurrent transactions did not terminate");
        }
    }

    private TransactionTemplate transaction() {
        var transaction = new TransactionTemplate(transactionManager);
        transaction.setTimeout(20);
        return transaction;
    }

    private void setDatabaseTimeouts() {
        jdbc.execute("set local lock_timeout='8s'");
        jdbc.execute("set local statement_timeout='12s'");
    }

    private void awaitCommitPermission(CountDownLatch release) {
        try {
            assertTrue(release.await(25, TimeUnit.SECONDS), "First transaction was not released");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError("First transaction interrupted", interrupted);
        }
    }

    private void awaitDatabaseLockOrCompletion(int backendPid, Future<?> contender) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            // An implementation that omits the association lock may finish early; its result is asserted after commit.
            if (contender.isDone()) return;
            if (Boolean.TRUE.equals(jdbc.queryForObject(
                    "select cardinality(pg_blocking_pids(?)) > 0", Boolean.class, backendPid))) return;
            TimeUnit.MILLISECONDS.sleep(10);
        }
        fail("Contending transaction neither reached a PostgreSQL lock nor completed");
    }
}
