package br.com.academia.auth;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Component @Profile("bootstrap")
public class BootstrapAdmin implements ApplicationRunner {
 private final AdministratorRepository repository; private final PasswordEncoder encoder; private final Environment env;
 public BootstrapAdmin(AdministratorRepository repository,PasswordEncoder encoder,Environment env) {this.repository=repository;this.encoder=encoder;this.env=env;}
 public void run(ApplicationArguments args) {
  if(repository.count()!=0) throw new IllegalStateException("Já existe uma conta administrativa. Bootstrap recusado.");
  String email=env.getRequiredProperty("ADMIN_EMAIL").trim().toLowerCase(Locale.ROOT);
  String password=env.getRequiredProperty("ADMIN_PASSWORD");
  if(!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || email.length()>180 || password.length()<14 || password.getBytes(StandardCharsets.UTF_8).length>72) throw new IllegalArgumentException("E-mail válido e senha entre 14 caracteres e 72 bytes são obrigatórios.");
  Administrator admin=new Administrator();admin.email=email;admin.passwordHash=encoder.encode(password);repository.saveAndFlush(admin);
 }
}
