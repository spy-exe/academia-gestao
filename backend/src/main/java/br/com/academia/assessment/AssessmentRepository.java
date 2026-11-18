package br.com.academia.assessment;
import org.springframework.data.jpa.repository.*;
public interface AssessmentRepository extends JpaRepository<Assessment,Long>,JpaSpecificationExecutor<Assessment> {}
