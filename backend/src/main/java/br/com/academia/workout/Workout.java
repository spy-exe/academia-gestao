package br.com.academia.workout;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.*;
import java.math.BigDecimal;
import br.com.academia.student.Student;
import br.com.academia.teacher.Teacher;
@Entity @Table(name="workouts")
public class Workout {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Version public Long version;
 @Column(nullable=false,length=120) public String name;
 @ManyToOne(optional=false) @JoinColumn(name="student_id") public Student student;
 @ManyToOne(optional=false) @JoinColumn(name="teacher_id") public Teacher teacher;
 @Column(nullable=false) public LocalDate issuedOn;
 @Column(nullable=false,length=2000) public String notes;
 @Column(nullable=false) public boolean active=true;
 @ElementCollection @CollectionTable(name="workout_exercises",joinColumns=@JoinColumn(name="workout_id")) @OrderColumn(name="position") public List<Exercise> exercises=new ArrayList<>();
 @Embeddable public static class Exercise {
  @Column(nullable=false,length=120) public String name;
  @Column(nullable=false) public int sets;
  @Column(nullable=false,length=40) public String repetitions;
  @Column(nullable=false,precision=6,scale=2) public BigDecimal loadKg;
  @Column(nullable=false) public int restSeconds;
  @Column(nullable=false,length=500) public String notes;
 }
}
