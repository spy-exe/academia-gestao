package br.com.academia.plan;
import br.com.academia.shared.*;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.util.*;
@Service @Transactional
public class PlanService {
 private final PlanRepository repository; private final ActivityService activities; 
 public PlanService(PlanRepository repository,ActivityService activities) {this.repository=repository;this.activities=activities;}
 public record Request(@NotBlank @Size(max=100) String name, @NotNull @DecimalMin("0.01") @DecimalMax("9999999999.99") @Digits(integer=10,fraction=2) java.math.BigDecimal price, @NotNull Integer periodMonths, @NotNull @Size(max=2000) String benefits, boolean active, Long version) {}
 public record View(Long id, String name, java.math.BigDecimal price, int periodMonths, String benefits, boolean active, Long version) {}
 public static View view(Plan e) {return new View(e.id,e.name,e.price,e.periodMonths,e.benefits,e.active,e.version);}
 @Transactional(readOnly=true) public Page<View> list(String q,Boolean active,Pageable page) {
  return repository.findAll((root,query,cb) -> {
   var predicates=new ArrayList<jakarta.persistence.criteria.Predicate>();
   if(!q.isBlank()) predicates.add(cb.like(cb.lower(root.get("name")),"%"+q.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%",'!'));
   if(active!=null) predicates.add(cb.equal(root.get("active"),active));
   return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
  },page).map(PlanService::view);
 }
 @Transactional(readOnly=true) public View get(long id) {return view(repository.findById(id).orElseThrow(ApiException::missing));}
 public View create(Request r) {var e=new Plan();apply(e,r);repository.saveAndFlush(e);activities.record("Plan salvo · "+e.name);return view(e);}
 public View update(long id,Request r) {var e=repository.lockById(id).orElseThrow(ApiException::missing);if(!Objects.equals(e.version,r.version())) throw ApiException.conflict("Registro alterado. Recarregue antes de salvar.");apply(e,r);repository.saveAndFlush(e);activities.record("Plan salvo · "+e.name);return view(e);}
 public void archive(long id) {var e=repository.lockById(id).orElseThrow(ApiException::missing);e.active=false;repository.saveAndFlush(e);activities.record("Plan arquivado · "+e.name);}
 private void apply(Plan e,Request r) { if(!java.util.Set.of(1,3,6,12).contains(r.periodMonths())) throw new IllegalArgumentException("Periodicidade inválida");
 e.name=r.name().trim();e.price=r.price();e.periodMonths=r.periodMonths();e.benefits=r.benefits().trim();e.active=r.active(); }
}
