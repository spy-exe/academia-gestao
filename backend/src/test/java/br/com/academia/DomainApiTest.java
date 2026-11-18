package br.com.academia;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

class DomainApiTest extends IntegrationSupport {
 private final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
 Map<String,Object> data(Object... pairs){var map=new LinkedHashMap<String,Object>();for(int i=0;i<pairs.length;i+=2)map.put((String)pairs[i],pairs[i+1]);return map;}
 ResultActions call(String method,String path,Object body)throws Exception{
  var req=switch(method){case "POST"->post(path);case "PUT"->put(path);case "DELETE"->delete(path);default->get(path);};
  req.with(user("test-admin").roles("ADMIN")).with(csrf());if(body!=null)req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));return mvc.perform(req);
 }
 JsonNode create(String path,Object body)throws Exception{return json.readTree(call("POST","/api/"+path,body).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());}
 Map<String,Object> plan(){return data("name","Plano API "+UUID.randomUUID(),"price",149.90,"periodMonths",1,"benefits","Acesso completo","active",true);}
 Map<String,Object> student(Long p){return data("name","Pessoa API "+UUID.randomUUID(),"email","person@example.test","phone","11999998888","birthDate","2000-01-01","enrollmentDate","2025-01-01","planId",p,"active",true);}
 Map<String,Object> teacher(){return data("name","Professor API "+UUID.randomUUID(),"email","teacher@example.test","phone","11977778888","specialties","Força","registration","REG-"+UUID.randomUUID().toString().substring(0,12),"active",true);}
 Map<String,Object> exercise(){return data("name","Agachamento","sets",3,"repetitions","12","loadKg",20,"restSeconds",60,"notes","");}
 Map<String,Object> workout(long s,long t){return data("name","Treino API "+UUID.randomUUID(),"studentId",s,"teacherId",t,"issuedOn","2026-01-01","notes","Início","exercises",List.of(exercise()));}
 Map<String,Object> assessment(long s){return data("studentId",s,"assessedOn","2026-01-02","weightKg",80,"heightCm",180,"waistCm",85,"chestCm",100,"hipCm",95,"notes","Acompanhamento");}
 @Test void plansCanBeReadEditedArchivedAndFiltered()throws Exception{
  var input=plan();var created=create("plans",input);long id=created.get("id").asLong();
  call("GET","/api/plans/"+id,null).andExpect(jsonPath("$.price").value(149.9));
  input.put("version",0);input.put("price",179.90);call("PUT","/api/plans/"+id,input).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
  call("PUT","/api/plans/"+id,input).andExpect(status().isConflict());
  call("DELETE","/api/plans/"+id,null).andExpect(status().isNoContent());
  call("GET","/api/plans?active=false&q="+((String)input.get("name")).substring("Plano API ".length()),null).andExpect(jsonPath("$.totalElements").value(1));
  call("GET","/api/plans?active=true&direction=desc&size=1",null).andExpect(status().isOk());
  input.put("periodMonths",2);input.remove("version");call("POST","/api/plans",input).andExpect(status().isBadRequest());
 }
 @Test void studentsRetainHistoryAndRejectConflictingReferences()throws Exception{
  var planInput=plan();long p=create("plans",planInput).get("id").asLong();var input=student(p);long id=create("students",input).get("id").asLong();
  call("GET","/api/students/"+id,null).andExpect(status().isOk());
  input.put("version",0);input.put("planId",null);call("PUT","/api/students/"+id,input).andExpect(status().isOk()).andExpect(jsonPath("$.plan").isEmpty());
  call("PUT","/api/students/"+id,input).andExpect(status().isConflict());
  input.put("version",1);input.put("planId",p);call("PUT","/api/students/"+id,input).andExpect(status().isOk());
  call("DELETE","/api/plans/"+p,null).andExpect(status().isNoContent());
  input.put("version",2);call("PUT","/api/students/"+id,input).andExpect(status().isOk());
  call("POST","/api/students",student(p)).andExpect(status().isConflict());
  call("POST","/api/students",student(999999L)).andExpect(status().isNotFound());
  var invalid=student(null);invalid.put("birthDate","2025-01-02");call("POST","/api/students",invalid).andExpect(status().isBadRequest());
  call("GET","/api/students?active=true&planId="+p,null).andExpect(jsonPath("$.totalElements").value(1));
  call("DELETE","/api/students/"+id,null).andExpect(status().isNoContent());
  call("GET","/api/students?active=false&q=Pessoa",null).andExpect(status().isOk());
 }
 @Test void teachersHandleOptionalRegistrationAndEnforceUniqueness()throws Exception{
  var input=teacher();long id=create("teachers",input).get("id").asLong();
  call("POST","/api/teachers",input).andExpect(status().isConflict());
  call("GET","/api/teachers/"+id,null).andExpect(status().isOk());input.put("version",0);input.put("registration","");
  call("PUT","/api/teachers/"+id,input).andExpect(status().isOk()).andExpect(jsonPath("$.registration").isEmpty());
  call("PUT","/api/teachers/"+id,input).andExpect(status().isConflict());
  input.remove("registration");input.remove("version");create("teachers",input);
  call("DELETE","/api/teachers/"+id,null).andExpect(status().isNoContent());
  call("GET","/api/teachers?active=false&q=Professor",null).andExpect(status().isOk());
 }
 @Test void financialFiltersPaymentAndInvalidAssociations()throws Exception{
  long p=create("plans",plan()).get("id").asLong();long s=create("students",student(p)).get("id").asLong();
  var today=LocalDate.now(ZoneId.of("America/Sao_Paulo"));
  var input=data("studentId",s,"competence","2026-04","dueDate",today.plusDays(5));long id=create("invoices",input).get("id").asLong();
  call("GET","/api/invoices?status=OPEN&studentId="+s+"&q=Pessoa",null).andExpect(jsonPath("$.totalElements").value(1));
  call("GET","/api/invoices?status=OVERDUE&studentId="+s,null).andExpect(jsonPath("$.totalElements").value(0));
  call("POST","/api/invoices/"+id+"/payment",data("paidOn",today)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAID"));
  call("POST","/api/invoices/"+id+"/payment",data("paidOn",today.minusDays(1))).andExpect(jsonPath("$.paidOn").value(today.toString()));
  call("GET","/api/invoices?status=PAID&studentId="+s,null).andExpect(jsonPath("$.totalElements").value(1));
  call("GET","/api/invoices?status=INVALID",null).andExpect(status().isBadRequest());
  call("POST","/api/invoices/999999/payment",data("paidOn",today)).andExpect(status().isNotFound());
  call("POST","/api/invoices/"+id+"/payment",data("paidOn",today.plusDays(1))).andExpect(status().isBadRequest());
  call("POST","/api/invoices",data("studentId",999999,"competence","2026-05","dueDate",today)).andExpect(status().isNotFound());
  long noPlan=create("students",student(null)).get("id").asLong();input.put("studentId",noPlan);call("POST","/api/invoices",input).andExpect(status().isConflict());
  call("DELETE","/api/students/"+s,null).andExpect(status().isNoContent());input.put("studentId",s);input.put("competence","2026-05");call("POST","/api/invoices",input).andExpect(status().isConflict());
  long other=create("students",student(p)).get("id").asLong();call("DELETE","/api/plans/"+p,null);input.put("studentId",other);call("POST","/api/invoices",input).andExpect(status().isConflict());
  call("GET","/api/dashboard",null).andExpect(status().isOk()).andExpect(jsonPath("$.monthlyRevenue").value(149.9));
 }
 @Test void workoutsPersistReorderedExercisesAndProtectReferences()throws Exception{
  long s=create("students",student(null)).get("id").asLong();long t=create("teachers",teacher()).get("id").asLong();var input=workout(s,t);long id=create("workouts",input).get("id").asLong();
  var second=exercise();second.put("name","Remada");input.put("exercises",List.of(second,exercise()));input.put("version",0);
  call("PUT","/api/workouts/"+id,input).andExpect(status().isOk()).andExpect(jsonPath("$.exercises[0].name").value("Remada"));
  call("PUT","/api/workouts/"+id,input).andExpect(status().isConflict());
  call("GET","/api/workouts?studentId="+s+"&active=true&q=Treino",null).andExpect(jsonPath("$.totalElements").value(1));
  call("DELETE","/api/teachers/"+t,null);call("POST","/api/workouts",workout(s,t)).andExpect(status().isConflict());
  input.put("version",1);call("PUT","/api/workouts/"+id,input).andExpect(status().isOk());
  long t2=create("teachers",teacher()).get("id").asLong();call("DELETE","/api/students/"+s,null);call("POST","/api/workouts",workout(s,t2)).andExpect(status().isConflict());
  call("POST","/api/workouts",workout(999999,t2)).andExpect(status().isNotFound());
  long s2=create("students",student(null)).get("id").asLong();call("POST","/api/workouts",workout(s2,999999)).andExpect(status().isNotFound());
  var nullExercise=workout(s2,t2);nullExercise.put("exercises",Collections.singletonList(null));call("POST","/api/workouts",nullExercise).andExpect(status().isBadRequest());
  call("DELETE","/api/workouts/"+id,null).andExpect(status().isNoContent());
  call("GET","/api/workouts/"+id,null).andExpect(jsonPath("$.active").value(false)).andExpect(jsonPath("$.exercises.length()").value(2));
  call("GET","/api/workouts?active=false",null).andExpect(status().isOk());
 }
 @Test void assessmentsEditMeasuresRetainChronologyAndValidateRanges()throws Exception{
  long s=create("students",student(null)).get("id").asLong();var input=assessment(s);long id=create("assessments",input).get("id").asLong();
  input.put("version",0);input.put("weightKg",79);call("PUT","/api/assessments/"+id,input).andExpect(status().isOk()).andExpect(jsonPath("$.bmi").value(24.38));
  call("PUT","/api/assessments/"+id,input).andExpect(status().isConflict());
  call("GET","/api/assessments/"+id,null).andExpect(status().isOk());
  call("GET","/api/assessments?studentId="+s+"&q=Pessoa&direction=desc",null).andExpect(jsonPath("$.totalElements").value(1));
  call("DELETE","/api/students/"+s,null);call("POST","/api/assessments",assessment(s)).andExpect(status().isConflict());input.put("version",1);call("PUT","/api/assessments/"+id,input).andExpect(status().isOk());
  call("POST","/api/assessments",assessment(999999)).andExpect(status().isNotFound());
  input.put("heightCm",0);call("POST","/api/assessments",input).andExpect(status().isBadRequest());
 }
 @Test void allBoundariesRejectMissingRecordsMalformedInputsAndUnauthorizedAccess()throws Exception{
  for(String path:List.of("plans","students","teachers","invoices","workouts","assessments")){
   call("GET","/api/"+path+"/999999",null).andExpect(status().isNotFound());
   call("GET","/api/"+path+"?page=-1",null).andExpect(status().isBadRequest());
   call("GET","/api/"+path+"?q=%25%5F",null).andExpect(status().isOk());
   call("GET","/api/"+path+"/invalid",null).andExpect(status().isBadRequest());
   mvc.perform(get("/api/"+path)).andExpect(status().isUnauthorized());
   mvc.perform(post("/api/"+path).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
   call("POST","/api/"+path,data()).andExpect(status().isBadRequest());
   mvc.perform(post("/api/"+path).with(user("admin").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{invalid}")).andExpect(status().isBadRequest());
  }
  for(String path:List.of("plans","students","teachers","workouts"))call("DELETE","/api/"+path+"/999999",null).andExpect(status().isNotFound());
  call("PUT","/api/plans/999999",plan()).andExpect(status().isNotFound());call("PUT","/api/students/999999",student(null)).andExpect(status().isNotFound());call("PUT","/api/teachers/999999",teacher()).andExpect(status().isNotFound());call("PUT","/api/workouts/999999",workout(1,1)).andExpect(status().isNotFound());call("PUT","/api/assessments/999999",assessment(1)).andExpect(status().isNotFound());
  mvc.perform(get("/api/students").with(user("other").roles("VIEWER"))).andExpect(status().isForbidden());
  mvc.perform(post("/api/auth/login").with(csrf()).param("email","unknown@example.test").param("password","invalid")).andExpect(status().isUnauthorized());
 }
}
