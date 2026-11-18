package br.com.academia.student;
import br.com.academia.shared.*;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.util.*;
@Service @Transactional
public class StudentService {
 private final StudentRepository repository; private final ActivityService activities; private final br.com.academia.plan.PlanRepository plans;
 public StudentService(StudentRepository repository,ActivityService activities,br.com.academia.plan.PlanRepository plans) {this.repository=repository;this.activities=activities;this.plans=plans;}
 public record Request(@NotBlank @Size(max=120) String name, @NotBlank @Email @Size(max=180) String email, @NotBlank @Pattern(regexp="[+()0-9 .-]{8,30}") String phone, @NotNull @Past java.time.LocalDate birthDate, @NotNull @PastOrPresent java.time.LocalDate enrollmentDate, Long planId, boolean active, Long version) {}
 public record View(Long id, String name, String email, String phone, java.time.LocalDate birthDate, java.time.LocalDate enrollmentDate, br.com.academia.plan.PlanService.View plan, boolean active, Long version) {}
 public static View view(Student e) {return new View(e.id,e.name,e.email,e.phone,e.birthDate,e.enrollmentDate,e.plan==null?null:br.com.academia.plan.PlanService.view(e.plan),e.active,e.version);}
 @Transactional(readOnly=true) public Page<View> list(String q,Boolean active,Long planId,Pageable page) {
  return repository.findAll((root,query,cb) -> {
   var predicates=new ArrayList<jakarta.persistence.criteria.Predicate>();
   if(!q.isBlank()) predicates.add(cb.like(cb.lower(root.get("name")),"%"+q.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%",'!'));
   if(planId!=null) predicates.add(cb.equal(root.get("plan").get("id"),planId));
   if(active!=null) predicates.add(cb.equal(root.get("active"),active));
   return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
  },page).map(StudentService::view);
 }
 @Transactional(readOnly=true) public View get(long id) {return view(repository.findById(id).orElseThrow(ApiException::missing));}
 public View create(Request r) {var e=new Student();apply(e,r);repository.saveAndFlush(e);activities.record("Student salvo · "+e.name);return view(e);}
 public View update(long id,Request r) {var e=repository.lockById(id).orElseThrow(ApiException::missing);if(!Objects.equals(e.version,r.version())) throw ApiException.conflict("Registro alterado. Recarregue antes de salvar.");apply(e,r);repository.saveAndFlush(e);activities.record("Student salvo · "+e.name);return view(e);}
 public void archive(long id) {var e=repository.lockById(id).orElseThrow(ApiException::missing);e.active=false;repository.saveAndFlush(e);activities.record("Student arquivado · "+e.name);}
 private void apply(Student e,Request r) { if(!r.birthDate().isBefore(r.enrollmentDate())) throw new IllegalArgumentException("Matrícula deve ser posterior ao nascimento");
 e.name=r.name().trim();e.email=r.email().trim();e.phone=r.phone().trim();e.birthDate=r.birthDate();e.enrollmentDate=r.enrollmentDate();e.active=r.active();
 if(r.planId()==null) e.plan=null;
 else {var plan=plans.lockById(r.planId()).orElseThrow(ApiException::missing);
  if(!plan.active && (e.plan==null || !plan.id.equals(e.plan.id))) throw ApiException.conflict("O plano está inativo.");e.plan=plan;} }
}
