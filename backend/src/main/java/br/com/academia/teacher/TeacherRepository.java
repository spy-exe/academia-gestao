package br.com.academia.teacher;
import org.springframework.data.jpa.repository.*;
public interface TeacherRepository extends JpaRepository<Teacher,Long>,JpaSpecificationExecutor<Teacher> {
 @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 @Query("select e from Teacher e where e.id=:id")
 java.util.Optional<Teacher> lockById(@org.springframework.data.repository.query.Param("id") long id);
}
