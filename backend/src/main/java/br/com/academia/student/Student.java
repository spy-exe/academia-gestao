package br.com.academia.student;
import jakarta.persistence.*;
@Entity @Table(name="students")
public class Student {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Version public Long version;
 @Column(nullable=false,length=120) public String name;
 @Column(nullable=false,length=180) public String email;
 @Column(nullable=false,length=30) public String phone;
 @Column(nullable=false) public java.time.LocalDate birthDate;
 @Column(nullable=false) public java.time.LocalDate enrollmentDate;
 @ManyToOne @JoinColumn(name="plan_id") public br.com.academia.plan.Plan plan;
 @Column(nullable=false) public boolean active;
}
