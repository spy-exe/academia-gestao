package br.com.academia;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
class DirectoryTest extends IntegrationSupport {
 @Test void createsAndSearchesPlansAndStudents() throws Exception {
  var plan=mvc.perform(post("/api/plans").with(user("admin").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Mensal teste\",\"price\":149.90,\"periodMonths\":1,\"benefits\":\"Musculação\",\"active\":true}")).andExpect(status().isCreated()).andReturn();
  var json=new com.fasterxml.jackson.databind.ObjectMapper();long id=json.readTree(plan.getResponse().getContentAsString()).get("id").asLong();
  mvc.perform(post("/api/students").with(user("admin").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Aluno Diretório\",\"email\":\"aluno@example.test\",\"phone\":\"11999999999\",\"birthDate\":\"2000-01-01\",\"enrollmentDate\":\"2025-01-01\",\"planId\":"+id+",\"active\":true}")).andExpect(status().isCreated()).andExpect(jsonPath("$.plan.name").value("Mensal teste"));
  mvc.perform(get("/api/students?q=Diretório").with(user("admin").roles("ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
 }
 @Test void rejectsInvalidAndUnknownData() throws Exception {
  mvc.perform(post("/api/plans").with(user("admin").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\",\"price\":-1,\"periodMonths\":0}")).andExpect(status().isBadRequest());
  mvc.perform(get("/api/students/999999").with(user("admin").roles("ADMIN"))).andExpect(status().isNotFound());
 }
}
