package br.com.academia.workout;

import org.springframework.data.jpa.repository.*;

public interface WorkoutRepository
    extends JpaRepository<Workout, Long>, JpaSpecificationExecutor<Workout> {}
