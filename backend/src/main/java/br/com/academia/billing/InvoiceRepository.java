package br.com.academia.billing;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
public interface InvoiceRepository extends JpaRepository<Invoice,Long>,JpaSpecificationExecutor<Invoice> {
 Optional<Invoice> findByStudentIdAndCompetence(long studentId,LocalDate competence);
}
