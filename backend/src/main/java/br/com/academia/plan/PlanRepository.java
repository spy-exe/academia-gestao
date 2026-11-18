package br.com.academia.plan;
import org.springframework.data.jpa.repository.*;
public interface PlanRepository extends JpaRepository<Plan,Long>,JpaSpecificationExecutor<Plan> {}
