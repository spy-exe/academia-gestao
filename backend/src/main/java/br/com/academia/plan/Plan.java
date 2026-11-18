package br.com.academia.plan;
import jakarta.persistence.*;
@Entity @Table(name="plans")
public class Plan {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Version public Long version;
 @Column(nullable=false,length=100) public String name;
 @Column(nullable=false,precision=12,scale=2) public java.math.BigDecimal price;
 @Column(nullable=false) public int periodMonths;
 @Column(nullable=false,length=2000) public String benefits;
 @Column(nullable=false) public boolean active;
}
