package br.com.academia.plan;
import br.com.academia.shared.Pages;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.Set;
@RestController @RequestMapping("/api/plans")
public class PlanController {
 private final PlanService service;
 public PlanController(PlanService service) {this.service=service;}
 @GetMapping public Page<PlanService.View> list(@RequestParam(defaultValue="") String q,@RequestParam(required=false) Boolean active,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,@RequestParam(defaultValue="name") String sort,@RequestParam(defaultValue="asc") String direction) {return service.list(q,active,Pages.of(page,size,sort,direction,Set.of("name","id")));}
 @GetMapping("/{id}") public PlanService.View get(@PathVariable long id) {return service.get(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public PlanService.View create(@Valid @RequestBody PlanService.Request r) {return service.create(r);}
 @PutMapping("/{id}") public PlanService.View update(@PathVariable long id,@Valid @RequestBody PlanService.Request r) {return service.update(id,r);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void archive(@PathVariable long id) {service.archive(id);}
}
