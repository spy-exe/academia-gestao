package br.com.academia.billing;

import br.com.academia.shared.PageResponse;
import br.com.academia.shared.Pages;
import jakarta.validation.Valid;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
  private final InvoiceService service;

  public InvoiceController(InvoiceService service) {
    this.service = service;
  }

  @GetMapping
  public PageResponse<InvoiceService.View> list(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(required = false) Long studentId,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "dueDate") String sort,
      @RequestParam(defaultValue = "asc") String direction) {
    return PageResponse.from(
        service.list(
            q,
            studentId,
            status,
            Pages.of(
                page, size, sort, direction, Set.of("dueDate", "id", "amount", "competence"))));
  }

  @GetMapping("/{id}")
  public InvoiceService.View get(@PathVariable long id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public InvoiceService.View create(@Valid @RequestBody InvoiceService.Request r) {
    return service.create(r);
  }

  @PostMapping("/{id}/payment")
  public InvoiceService.View pay(
      @PathVariable long id, @Valid @RequestBody InvoiceService.Payment r) {
    return service.pay(id, r);
  }
}
