package br.com.academia.student;
import org.springframework.data.jpa.repository.*;
public interface StudentRepository extends JpaRepository<Student,Long>,JpaSpecificationExecutor<Student> {}
