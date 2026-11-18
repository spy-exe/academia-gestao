package br.com.academia.teacher;
import org.springframework.data.jpa.repository.*;
public interface TeacherRepository extends JpaRepository<Teacher,Long>,JpaSpecificationExecutor<Teacher> {}
