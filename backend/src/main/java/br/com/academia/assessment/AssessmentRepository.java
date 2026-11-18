package br.com.academia.assessment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;

public interface AssessmentRepository
    extends JpaRepository<Assessment, Long>, JpaSpecificationExecutor<Assessment> {
  @Override
  @EntityGraph(attributePaths = {"student", "student.plan"})
  Page<Assessment> findAll(Specification<Assessment> specification, Pageable pageable);
}
