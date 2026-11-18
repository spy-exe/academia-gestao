package br.com.academia.teacher;
import br.com.academia.shared.Pages;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.Set;
@RestController @RequestMapping("/api/teachers")
public class TeacherController {
 private final TeacherService service;
 public TeacherController(TeacherService service) {this.service=service;}
 @GetMapping public Page<TeacherService.View> list(@RequestParam(defaultValue="") String q,@RequestParam(required=false) Boolean active,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,@RequestParam(defaultValue="name") String sort,@RequestParam(defaultValue="asc") String direction) {return service.list(q,active,Pages.of(page,size,sort,direction,Set.of("name","id")));}
 @GetMapping("/{id}") public TeacherService.View get(@PathVariable long id) {return service.get(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public TeacherService.View create(@Valid @RequestBody TeacherService.Request r) {return service.create(r);}
 @PutMapping("/{id}") public TeacherService.View update(@PathVariable long id,@Valid @RequestBody TeacherService.Request r) {return service.update(id,r);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void archive(@PathVariable long id) {service.archive(id);}
}
