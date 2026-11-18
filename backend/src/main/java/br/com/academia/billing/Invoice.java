package br.com.academia.billing;

import br.com.academia.student.Student;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "invoices")
public class Invoice {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "student_id")
  public Student student;

  @Column(nullable = false)
  public LocalDate competence;

  @Column(nullable = false)
  public LocalDate dueDate;

  @Column(nullable = false, precision = 12, scale = 2)
  public BigDecimal amount;

  @Column(nullable = false)
  public int periodMonths;

  public LocalDate paidOn;

  public String status(LocalDate today) {
    return paidOn != null ? "PAID" : dueDate.isBefore(today) ? "OVERDUE" : "OPEN";
  }
}
