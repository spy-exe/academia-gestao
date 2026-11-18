package br.com.academia.plan;
import org.springframework.data.jpa.repository.*;
public interface PlanRepository extends JpaRepository<Plan,Long>,JpaSpecificationExecutor<Plan> {
 @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 @Query("select e from Plan e where e.id=:id")
 java.util.Optional<Plan> lockById(@org.springframework.data.repository.query.Param("id") long id);
}
