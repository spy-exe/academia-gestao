package br.com.academia.student;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;

public interface StudentRepository
    extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {
  @Override
  @EntityGraph(attributePaths = {"plan"})
  Page<Student> findAll(Specification<Student> specification, Pageable pageable);

  @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from Student e where e.id=:id")
  java.util.Optional<Student> lockById(
      @org.springframework.data.repository.query.Param("id") long id);
}
