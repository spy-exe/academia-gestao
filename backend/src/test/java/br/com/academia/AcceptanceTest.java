package br.com.academia;
import br.com.academia.auth.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

class AcceptanceTest extends IntegrationSupport {
 @Test void administrativeDataRequiresAuthentication() throws Exception {mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());}
 @Test void providesCsrfWithoutAuthentication() throws Exception {mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty());}
 @Test void rejectsLoginWithoutCsrf() throws Exception {mvc.perform(post("/api/auth/login").param("email","admin@example.test").param("password","Test-only-password-2026!")).andExpect(status().isForbidden());}
 @Test void loginAndLogoutUseProtectedSession() throws Exception {
  var login=mvc.perform(post("/api/auth/login").with(csrf()).param("email","ADMIN@example.test").param("password","Test-only-password-2026!")).andExpect(status().isOk()).andReturn();
  var session=(org.springframework.mock.web.MockHttpSession)login.getRequest().getSession(false);
  mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value("admin@example.test"));
  mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
 }
 @Test void invalidPasswordIsRejected() throws Exception {mvc.perform(post("/api/auth/login").with(csrf()).param("email","admin@example.test").param("password","invalid")).andExpect(status().isUnauthorized());}
}
