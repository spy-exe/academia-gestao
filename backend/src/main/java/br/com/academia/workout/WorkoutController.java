package br.com.academia.workout;

import br.com.academia.shared.PageResponse;
import br.com.academia.shared.Pages;
import jakarta.validation.Valid;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {
  private final WorkoutService service;

  public WorkoutController(WorkoutService service) {
    this.service = service;
  }

  @GetMapping
  public PageResponse<WorkoutService.Summary> list(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(required = false) Long studentId,
      @RequestParam(required = false) Boolean active,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "issuedOn") String sort,
      @RequestParam(defaultValue = "asc") String direction) {
    return PageResponse.from(
        service.list(
            q,
            studentId,
            active,
            Pages.of(page, size, sort, direction, Set.of("issuedOn", "name", "id"))));
  }

  @GetMapping("/{id}")
  public WorkoutService.View get(@PathVariable long id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public WorkoutService.View create(@Valid @RequestBody WorkoutService.Request r) {
    return service.create(r);
  }

  @PutMapping("/{id}")
  public WorkoutService.View update(
      @PathVariable long id, @Valid @RequestBody WorkoutService.Request r) {
    return service.update(id, r);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void archive(@PathVariable long id) {
    service.archive(id);
  }
}
