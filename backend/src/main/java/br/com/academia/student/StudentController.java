package br.com.academia.student;
import br.com.academia.shared.Pages;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.Set;
@RestController @RequestMapping("/api/students")
public class StudentController {
 private final StudentService service;
 public StudentController(StudentService service) {this.service=service;}
 @GetMapping public Page<StudentService.View> list(@RequestParam(defaultValue="") String q,@RequestParam(required=false) Boolean active,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,@RequestParam(defaultValue="name") String sort,@RequestParam(defaultValue="asc") String direction) {return service.list(q,active,Pages.of(page,size,sort,direction,Set.of("name","id")));}
 @GetMapping("/{id}") public StudentService.View get(@PathVariable long id) {return service.get(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public StudentService.View create(@Valid @RequestBody StudentService.Request r) {return service.create(r);}
 @PutMapping("/{id}") public StudentService.View update(@PathVariable long id,@Valid @RequestBody StudentService.Request r) {return service.update(id,r);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void archive(@PathVariable long id) {service.archive(id);}
}
