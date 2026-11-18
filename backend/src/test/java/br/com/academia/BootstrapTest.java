package br.com.academia;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import br.com.academia.auth.*;
import br.com.academia.shared.ActivityService;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

class BootstrapTest {
  @Test
  void initialAdministratorHasNormalizedEmailAndHashedPassword() {
    var repository = mock(AdministratorRepository.class);
    var encoder = mock(PasswordEncoder.class);
    when(encoder.encode("A-long-test-only-password!")).thenReturn("encoded-hash");
    try (var context = new AnnotationConfigApplicationContext()) {
      context.refresh();
      var env =
          new MockEnvironment()
              .withProperty("ADMIN_EMAIL", " ADMIN@EXAMPLE.TEST ")
              .withProperty("ADMIN_PASSWORD", "A-long-test-only-password!");
      new BootstrapAdmin(repository, encoder, env, context).run(null);
      var saved = org.mockito.ArgumentCaptor.forClass(Administrator.class);
      verify(repository).saveAndFlush(saved.capture());
      assertEquals("admin@example.test", saved.getValue().email);
      assertEquals("encoded-hash", saved.getValue().passwordHash);
    }
  }

  @Test
  void refusesExistingAdministrator() {
    var repository = mock(AdministratorRepository.class);
    when(repository.count()).thenReturn(1L);
    try (var context = new AnnotationConfigApplicationContext()) {
      context.refresh();
      assertThrows(
          IllegalStateException.class,
          () ->
              new BootstrapAdmin(
                      repository, mock(PasswordEncoder.class), new MockEnvironment(), context)
                  .run(null));
    }
  }

  @Test
  void refusesInvalidEmailsAndUnsafePasswordLengths() {
    for (var pair :
        new String[][] {
          {"invalid", "Long-enough-password"},
          {"a".repeat(175) + "@test.example", "Long-enough-password"},
          {"valid@example.test", "short"},
          {"valid@example.test", "é".repeat(40)}
        }) {
      var repository = mock(AdministratorRepository.class);
      var env =
          new MockEnvironment()
              .withProperty("ADMIN_EMAIL", pair[0])
              .withProperty("ADMIN_PASSWORD", pair[1]);
      try (var context = new AnnotationConfigApplicationContext()) {
        context.refresh();
        assertThrows(
            IllegalArgumentException.class,
            () ->
                new BootstrapAdmin(repository, mock(PasswordEncoder.class), env, context)
                    .run(null));
        verify(repository, never()).saveAndFlush(any());
      }
    }
  }

  @Test
  void auditEventsWithoutAnAuthenticatedActorAreLabeledSystem() {
    SecurityContextHolder.clearContext();
    var jdbc = mock(JdbcTemplate.class);
    new ActivityService(jdbc).record("Teste de sistema");
    verify(jdbc)
        .update(
            "insert into activities(actor,description) values (?,?)",
            "sistema",
            "Teste de sistema");
  }
}
