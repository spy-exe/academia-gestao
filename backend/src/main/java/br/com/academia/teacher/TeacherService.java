package br.com.academia.teacher;

import br.com.academia.shared.*;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TeacherService {
  private final TeacherRepository repository;
  private final ActivityService activities;

  public TeacherService(TeacherRepository repository, ActivityService activities) {
    this.repository = repository;
    this.activities = activities;
  }

  public record Request(
      @NotBlank @Size(max = 120) String name,
      @NotBlank @Email @Size(max = 180) String email,
      @NotBlank @Pattern(regexp = "[+()0-9 .-]{8,30}") String phone,
      @NotBlank @Size(max = 500) String specialties,
      @Size(max = 40) String registration,
      boolean active,
      Long version) {}

  public record View(
      Long id,
      String name,
      String email,
      String phone,
      String specialties,
      String registration,
      boolean active,
      Long version) {}

  public static View view(Teacher e) {
    return new View(
        e.id, e.name, e.email, e.phone, e.specialties, e.registration, e.active, e.version);
  }

  @Transactional(readOnly = true)
  public Page<View> list(String q, Boolean active, Pageable page) {
    return repository
        .findAll(
            (root, query, cb) -> {
              var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
              if (!q.isBlank())
                predicates.add(
                    cb.like(
                        cb.lower(root.get("name")),
                        "%"
                            + q.toLowerCase(Locale.ROOT)
                                .replace("!", "!!")
                                .replace("%", "!%")
                                .replace("_", "!_")
                            + "%",
                        '!'));
              if (active != null) predicates.add(cb.equal(root.get("active"), active));
              return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
            },
            page)
        .map(TeacherService::view);
  }

  @Transactional(readOnly = true)
  public View get(long id) {
    return view(repository.findById(id).orElseThrow(ApiException::missing));
  }

  public View create(Request r) {
    var e = new Teacher();
    apply(e, r);
    repository.saveAndFlush(e);
    activities.record("Teacher salvo · " + e.name);
    return view(e);
  }

  public View update(long id, Request r) {
    var e = repository.lockById(id).orElseThrow(ApiException::missing);
    if (!Objects.equals(e.version, r.version()))
      throw ApiException.conflict("Registro alterado. Recarregue antes de salvar.");
    apply(e, r);
    repository.saveAndFlush(e);
    activities.record("Teacher salvo · " + e.name);
    return view(e);
  }

  public void archive(long id) {
    var e = repository.lockById(id).orElseThrow(ApiException::missing);
    e.active = false;
    repository.saveAndFlush(e);
    activities.record("Teacher arquivado · " + e.name);
  }

  private void apply(Teacher e, Request r) {
    e.name = r.name().trim();
    e.email = r.email().trim();
    e.phone = r.phone().trim();
    e.specialties = r.specialties().trim();
    e.registration =
        r.registration() == null || r.registration().isBlank() ? null : r.registration().trim();
    e.active = r.active();
  }
}
