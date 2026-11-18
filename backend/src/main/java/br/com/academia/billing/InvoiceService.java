package br.com.academia.billing;

import br.com.academia.shared.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InvoiceService {
  private final br.com.academia.student.StudentRepository students;
  private final InvoiceRepository repository;
  private final EntityManager em;
  private final ActivityService activities;
  private final Clock clock;

  public InvoiceService(
      br.com.academia.student.StudentRepository students,
      InvoiceRepository repository,
      EntityManager em,
      ActivityService activities,
      Clock clock) {
    this.students = students;
    this.clock = clock;
    this.repository = repository;
    this.em = em;
    this.activities = activities;
  }

  public record Request(
      @NotNull @Positive Long studentId,
      @NotBlank @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])") String competence,
      @NotNull LocalDate dueDate) {}

  public record Payment(@NotNull @PastOrPresent LocalDate paidOn) {}

  public record Person(Long id, String name) {}

  public record View(
      Long id,
      Person student,
      String competence,
      LocalDate dueDate,
      BigDecimal amount,
      int periodMonths,
      LocalDate paidOn,
      String status) {}

  private LocalDate today() {
    return LocalDate.now(clock);
  }

  public View view(Invoice e) {
    return new View(
        e.id,
        new Person(e.student.id, e.student.name),
        YearMonth.from(e.competence).toString(),
        e.dueDate,
        e.amount,
        e.periodMonths,
        e.paidOn,
        e.status(today()));
  }

  @Transactional(readOnly = true)
  public Page<View> list(String q, Long studentId, String status, Pageable page) {
    if (status != null && !Set.of("PAID", "OPEN", "OVERDUE").contains(status))
      throw new IllegalArgumentException("Status inválido");
    return repository
        .findAll(
            (root, query, cb) -> {
              var p = new ArrayList<jakarta.persistence.criteria.Predicate>();
              if (!q.isBlank())
                p.add(
                    cb.like(
                        cb.lower(root.get("student").get("name")),
                        "%"
                            + q.toLowerCase(Locale.ROOT)
                                .replace("!", "!!")
                                .replace("%", "!%")
                                .replace("_", "!_")
                            + "%",
                        '!'));
              if (studentId != null) p.add(cb.equal(root.get("student").get("id"), studentId));
              if ("PAID".equals(status)) p.add(cb.isNotNull(root.get("paidOn")));
              if ("OPEN".equals(status)) {
                p.add(cb.isNull(root.get("paidOn")));
                p.add(cb.greaterThanOrEqualTo(root.get("dueDate"), today()));
              }
              if ("OVERDUE".equals(status)) {
                p.add(cb.isNull(root.get("paidOn")));
                p.add(cb.lessThan(root.get("dueDate"), today()));
              }
              return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
            },
            page)
        .map(this::view);
  }

  @Transactional(readOnly = true)
  public View get(long id) {
    return view(repository.findById(id).orElseThrow(ApiException::missing));
  }

  public View create(Request r) {
    var student = students.lockById(r.studentId()).orElseThrow(ApiException::missing);
    var competence = YearMonth.parse(r.competence()).atDay(1);
    var existing = repository.findByStudentIdAndCompetence(student.id, competence);
    if (existing.isPresent()) return view(existing.get());
    if (!student.active)
      throw ApiException.conflict("Aluno arquivado não pode receber novas mensalidades.");
    if (student.plan == null || !student.plan.active)
      throw ApiException.conflict(
          "Associe o aluno a um plano ativo antes de emitir a mensalidade.");
    em.lock(student.plan, LockModeType.PESSIMISTIC_WRITE);
    em.refresh(student.plan);
    if (!student.plan.active)
      throw ApiException.conflict("O plano foi desativado. Atualize o cadastro.");
    var end = competence.plusMonths(student.plan.periodMonths);
    if (repository.overlaps(student.id, competence, end))
      throw ApiException.conflict("Já existe uma mensalidade cobrindo parte deste período.");
    Invoice e = new Invoice();
    e.student = student;
    e.competence = competence;
    e.dueDate = r.dueDate();
    e.amount = student.plan.price;
    e.periodMonths = student.plan.periodMonths;
    repository.saveAndFlush(e);
    activities.record("Mensalidade emitida · " + student.name + " · " + r.competence());
    return view(e);
  }

  public View pay(long id, Payment r) {
    var e = em.find(Invoice.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (e == null) throw ApiException.missing();
    if (e.paidOn == null) {
      e.paidOn = r.paidOn();
      repository.saveAndFlush(e);
      activities.record("Pagamento registrado · " + e.student.name);
    }
    return view(e);
  }
}
