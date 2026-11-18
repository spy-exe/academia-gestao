package br.com.academia.workout;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;

public interface WorkoutRepository
    extends JpaRepository<Workout, Long>, JpaSpecificationExecutor<Workout> {
  @Override
  @EntityGraph(attributePaths = {"student", "student.plan", "teacher"})
  Page<Workout> findAll(Specification<Workout> specification, Pageable pageable);
}
