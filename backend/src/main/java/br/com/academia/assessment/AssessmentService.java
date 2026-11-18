package br.com.academia.assessment;
import br.com.academia.shared.*;
import br.com.academia.student.*;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;
@Service @Transactional
public class AssessmentService {
 private final AssessmentRepository repository;private final StudentRepository students;private final ActivityService activities;
 public AssessmentService(AssessmentRepository repository,StudentRepository students,ActivityService activities){this.repository=repository;this.students=students;this.activities=activities;}
 public record Request(@NotNull @Positive Long studentId,@NotNull @PastOrPresent LocalDate assessedOn,@NotNull @DecimalMin("1") @DecimalMax("500") @Digits(integer=3,fraction=2) BigDecimal weightKg,@NotNull @DecimalMin("30") @DecimalMax("260") @Digits(integer=3,fraction=2) BigDecimal heightCm,@DecimalMin("1") @DecimalMax("300") @Digits(integer=3,fraction=2) BigDecimal waistCm,@DecimalMin("1") @DecimalMax("300") @Digits(integer=3,fraction=2) BigDecimal chestCm,@DecimalMin("1") @DecimalMax("300") @Digits(integer=3,fraction=2) BigDecimal hipCm,@NotNull @Size(max=2000) String notes,Long version){}
 public record Person(Long id,String name){}
 public record View(Long id,Long version,Person student,LocalDate assessedOn,BigDecimal weightKg,BigDecimal heightCm,BigDecimal waistCm,BigDecimal chestCm,BigDecimal hipCm,BigDecimal bmi,String notes){}
 private View view(Assessment e){return new View(e.id,e.version,new Person(e.student.id,e.student.name),e.assessedOn,e.weightKg,e.heightCm,e.waistCm,e.chestCm,e.hipCm,e.bmi(),e.notes);}
 @Transactional(readOnly=true) public Page<View> list(String q,Long studentId,Pageable page){return repository.findAll((root,query,cb)->{var p=new ArrayList<jakarta.persistence.criteria.Predicate>();if(!q.isBlank())p.add(cb.like(cb.lower(root.get("student").get("name")),"%"+q.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%",'!'));if(studentId!=null)p.add(cb.equal(root.get("student").get("id"),studentId));return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));},page).map(this::view);}
 @Transactional(readOnly=true) public View get(long id){return view(repository.findById(id).orElseThrow(ApiException::missing));}
 public View create(Request r){var e=new Assessment();apply(e,r);repository.saveAndFlush(e);activities.record("Avaliação registrada · "+e.student.name);return view(e);}
 public View update(long id,Request r){var e=repository.findById(id).orElseThrow(ApiException::missing);if(!Objects.equals(e.version,r.version()))throw ApiException.conflict("Avaliação alterada. Recarregue antes de salvar.");apply(e,r);repository.saveAndFlush(e);activities.record("Avaliação atualizada · "+e.student.name);return view(e);}
 private void apply(Assessment e,Request r){var student=students.lockById(r.studentId()).orElseThrow(ApiException::missing);if(!student.active&&(e.student==null||!student.id.equals(e.student.id)))throw ApiException.conflict("Selecione um aluno ativo.");e.student=student;e.assessedOn=r.assessedOn();e.weightKg=r.weightKg();e.heightCm=r.heightCm();e.waistCm=r.waistCm();e.chestCm=r.chestCm();e.hipCm=r.hipCm();e.notes=r.notes().trim();}
}
