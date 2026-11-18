package br.com.academia.auth;

import jakarta.persistence.*;

@Entity
@Table(name = "administrators")
public class Administrator {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(nullable = false, unique = true, length = 180)
  public String email;

  @Column(nullable = false, length = 100)
  public String passwordHash;
}
