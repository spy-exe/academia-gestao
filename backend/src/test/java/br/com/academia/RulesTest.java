package br.com.academia;
import br.com.academia.workout.WorkoutService;
import br.com.academia.billing.Invoice;
import br.com.academia.assessment.Assessment;
import br.com.academia.shared.Pages;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class RulesTest {
 @Test void rejectsNullExerciseBeforeReachingPersistence(){try(var factory=Validation.buildDefaultValidatorFactory()){var request=new WorkoutService.Request("Ficha",1L,2L,LocalDate.of(2026,1,1),"",Arrays.asList((WorkoutService.ExerciseRequest)null),null);assertFalse(factory.getValidator().validate(request).isEmpty());}}
 @Test void invoiceStatusUsesPaymentAndCurrentDate(){var invoice=new Invoice();invoice.dueDate=LocalDate.of(2026,1,10);assertEquals("OPEN",invoice.status(LocalDate.of(2026,1,10)));assertEquals("OPEN",invoice.status(LocalDate.of(2026,1,9)));assertEquals("OVERDUE",invoice.status(LocalDate.of(2026,1,11)));invoice.paidOn=LocalDate.of(2026,1,8);assertEquals("PAID",invoice.status(LocalDate.of(2026,1,11)));}
 @Test void bmiIsRoundedWithoutDiagnosis(){var a=new Assessment();a.weightKg=new BigDecimal("82.35");a.heightCm=new BigDecimal("178");assertEquals(new BigDecimal("25.99"),a.bmi());}
 @Test void pagingRejectsInvalidParameters(){for(var args:List.of(new String[]{"-1","10","name","asc"},new String[]{"0","0","name","asc"},new String[]{"0","51","name","asc"},new String[]{"0","10","unknown","asc"},new String[]{"0","10","name","sideways"})){assertThrows(IllegalArgumentException.class,()->Pages.of(Integer.parseInt(args[0]),Integer.parseInt(args[1]),args[2],args[3],Set.of("name")));}assertEquals(10,Pages.of(0,10,"name","desc",Set.of("name")).getPageSize());}
}
