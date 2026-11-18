package br.com.academia.workout;
import br.com.academia.shared.*;
import br.com.academia.student.*;
import br.com.academia.teacher.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;
@Service @Transactional
public class WorkoutService {
 private final WorkoutRepository repository;private final StudentRepository students;private final TeacherRepository teachers;private final ActivityService activities;
 public WorkoutService(WorkoutRepository repository,StudentRepository students,TeacherRepository teachers,ActivityService activities){this.repository=repository;this.students=students;this.teachers=teachers;this.activities=activities;}
 public record ExerciseRequest(@NotBlank @Size(max=120) String name,@NotNull @Min(1) @Max(30) Integer sets,@NotBlank @Size(max=40) String repetitions,@NotNull @DecimalMin("0") @DecimalMax("1000") @Digits(integer=4,fraction=2) BigDecimal loadKg,@NotNull @Min(0) @Max(1800) Integer restSeconds,@NotNull @Size(max=500) String notes){}
 public record Request(@NotBlank @Size(max=120) String name,@NotNull @Positive Long studentId,@NotNull @Positive Long teacherId,@NotNull @PastOrPresent LocalDate issuedOn,@NotNull @Size(max=2000) String notes,@NotEmpty @Size(max=50) List<@NotNull @Valid ExerciseRequest> exercises,Long version){}
 public record Person(Long id,String name){}
 public record Summary(Long id,Long version,String name,Person student,Person teacher,LocalDate issuedOn,String notes,boolean active){}
 public record View(Long id,Long version,String name,Person student,Person teacher,LocalDate issuedOn,String notes,boolean active,List<ExerciseRequest> exercises){}
 private Summary summary(Workout e){return new Summary(e.id,e.version,e.name,new Person(e.student.id,e.student.name),new Person(e.teacher.id,e.teacher.name),e.issuedOn,e.notes,e.active);}
 private View view(Workout e){return new View(e.id,e.version,e.name,new Person(e.student.id,e.student.name),new Person(e.teacher.id,e.teacher.name),e.issuedOn,e.notes,e.active,e.exercises.stream().map(x->new ExerciseRequest(x.name,x.sets,x.repetitions,x.loadKg,x.restSeconds,x.notes)).toList());}
 @Transactional(readOnly=true) public Page<Summary> list(String q,Long studentId,Boolean active,Pageable page){return repository.findAll((root,query,cb)->{var p=new ArrayList<jakarta.persistence.criteria.Predicate>();if(!q.isBlank())p.add(cb.like(cb.lower(root.get("name")),"%"+q.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%",'!'));if(studentId!=null)p.add(cb.equal(root.get("student").get("id"),studentId));if(active!=null)p.add(cb.equal(root.get("active"),active));return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));},page).map(this::summary);}
 @Transactional(readOnly=true) public View get(long id){return view(repository.findById(id).orElseThrow(ApiException::missing));}
 public View create(Request r){var e=new Workout();apply(e,r);repository.saveAndFlush(e);activities.record("Ficha criada · "+e.name);return view(e);}
 public View update(long id,Request r){var e=repository.findById(id).orElseThrow(ApiException::missing);if(!Objects.equals(e.version,r.version()))throw ApiException.conflict("Ficha alterada. Recarregue antes de salvar.");apply(e,r);repository.saveAndFlush(e);activities.record("Ficha atualizada · "+e.name);return view(e);}
 public void archive(long id){var e=repository.findById(id).orElseThrow(ApiException::missing);e.active=false;repository.saveAndFlush(e);activities.record("Ficha arquivada · "+e.name);}
 private void apply(Workout e,Request r){
  var student=students.lockById(r.studentId()).orElseThrow(ApiException::missing);var teacher=teachers.lockById(r.teacherId()).orElseThrow(ApiException::missing);
  if(!student.active&&(e.student==null||!student.id.equals(e.student.id)))throw ApiException.conflict("Selecione um aluno ativo.");
  if(!teacher.active&&(e.teacher==null||!teacher.id.equals(e.teacher.id)))throw ApiException.conflict("Selecione um professor ativo.");
  e.name=r.name().trim();e.student=student;e.teacher=teacher;e.issuedOn=r.issuedOn();e.notes=r.notes().trim();e.exercises.clear();
  for(var input:r.exercises()){var x=new Workout.Exercise();x.name=input.name().trim();x.sets=input.sets();x.repetitions=input.repetitions().trim();x.loadKg=input.loadKg();x.restSeconds=input.restSeconds();x.notes=input.notes().trim();e.exercises.add(x);}
 }
}
