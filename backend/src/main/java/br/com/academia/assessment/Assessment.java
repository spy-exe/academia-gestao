package br.com.academia.assessment;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.math.*;
import br.com.academia.student.Student;
@Entity @Table(name="assessments")
public class Assessment {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Version public Long version;
 @ManyToOne(optional=false) @JoinColumn(name="student_id") public Student student;
 @Column(nullable=false) public LocalDate assessedOn;
 @Column(nullable=false,precision=5,scale=2) public BigDecimal weightKg;
 @Column(nullable=false,precision=5,scale=2) public BigDecimal heightCm;
 @Column(precision=5,scale=2) public BigDecimal waistCm;
 @Column(precision=5,scale=2) public BigDecimal chestCm;
 @Column(precision=5,scale=2) public BigDecimal hipCm;
 @Column(nullable=false,length=2000) public String notes;
 public BigDecimal bmi(){return weightKg.multiply(new BigDecimal("10000")).divide(heightCm.multiply(heightCm),2,RoundingMode.HALF_UP);}
}
