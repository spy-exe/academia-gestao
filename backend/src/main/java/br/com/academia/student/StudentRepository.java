package br.com.academia.student;

import org.springframework.data.jpa.repository.*;

public interface StudentRepository
    extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {
  @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from Student e where e.id=:id")
  java.util.Optional<Student> lockById(
      @org.springframework.data.repository.query.Param("id") long id);
}
