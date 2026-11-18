package br.com.academia;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import br.com.academia.auth.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

@Testcontainers
abstract class IntegrationSupport {
  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

  private static ConfigurableApplicationContext context;
  MockMvc mvc;
  @Autowired AdministratorRepository administrators;
  @Autowired PasswordEncoder encoder;

  @BeforeAll
  static void startApplication() {
    context =
        SpringApplication.run(
            AcademiaApplication.class,
            "--server.port=0",
            "--server.address=127.0.0.1",
            "--spring.datasource.url=" + postgres.getJdbcUrl(),
            "--spring.datasource.username=" + postgres.getUsername(),
            "--spring.datasource.password=" + postgres.getPassword(),
            "--server.servlet.session.cookie.secure=false");
  }

  @AfterAll
  static void stopApplication() {
    if (context != null) context.close();
  }

  @BeforeEach
  void account() {
    context.getAutowireCapableBeanFactory().autowireBean(this);
    mvc =
        MockMvcBuilders.webAppContextSetup((WebApplicationContext) context)
            .apply(springSecurity())
            .build();
    if (administrators.count() == 0) {
      Administrator a = new Administrator();
      a.email = "admin@example.test";
      a.passwordHash = encoder.encode("Test-only-password-2026!");
      administrators.save(a);
    }
  }
}
