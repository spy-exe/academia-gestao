package br.com.academia.assessment;

import br.com.academia.shared.PageResponse;
import br.com.academia.shared.Pages;
import jakarta.validation.Valid;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assessments")
public class AssessmentController {
  private final AssessmentService service;

  public AssessmentController(AssessmentService service) {
    this.service = service;
  }

  @GetMapping
  public PageResponse<AssessmentService.View> list(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(required = false) Long studentId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "assessedOn") String sort,
      @RequestParam(defaultValue = "asc") String direction) {
    return PageResponse.from(
        service.list(
            q, studentId, Pages.of(page, size, sort, direction, Set.of("assessedOn", "id"))));
  }

  @GetMapping("/{id}")
  public AssessmentService.View get(@PathVariable long id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public AssessmentService.View create(@Valid @RequestBody AssessmentService.Request r) {
    return service.create(r);
  }

  @PutMapping("/{id}")
  public AssessmentService.View update(
      @PathVariable long id, @Valid @RequestBody AssessmentService.Request r) {
    return service.update(id, r);
  }
}
