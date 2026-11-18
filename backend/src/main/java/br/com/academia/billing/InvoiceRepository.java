package br.com.academia.billing;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface InvoiceRepository
    extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {
  Optional<Invoice> findByStudentIdAndCompetence(long studentId, LocalDate competence);

  @Query(
      value =
          "select exists(select 1 from invoices where student_id=:studentId and competence < :end"
              + " and (competence + period_months * interval '1 month') > :start)",
      nativeQuery = true)
  boolean overlaps(
      @org.springframework.data.repository.query.Param("studentId") long studentId,
      @org.springframework.data.repository.query.Param("start") LocalDate start,
      @org.springframework.data.repository.query.Param("end") LocalDate end);
}
