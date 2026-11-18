package br.com.academia.teacher;

import jakarta.persistence.*;

@Entity
@Table(name = "teachers")
public class Teacher {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Version public Long version;

  @Column(nullable = false, length = 120)
  public String name;

  @Column(nullable = false, length = 180)
  public String email;

  @Column(nullable = false, length = 30)
  public String phone;

  @Column(nullable = false, length = 500)
  public String specialties;

  @Column(unique = true, length = 40)
  public String registration;

  @Column(nullable = false)
  public boolean active;
}
