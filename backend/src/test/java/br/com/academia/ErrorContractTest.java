package br.com.academia;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import br.com.academia.shared.ApiErrors;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;

class ErrorContractTest {
  @RestController
  static class FaultController {
    @GetMapping("/unexpected")
    public String failure() {
      throw new IllegalStateException("Detalhe interno de diagnóstico");
    }
  }

  @Test
  void unexpectedErrorsUseProblemDetailsWithoutExposingInternals() throws Exception {
    var mvc =
        MockMvcBuilders.standaloneSetup(new FaultController())
            .setControllerAdvice(new ApiErrors())
            .build();
    mvc.perform(get("/unexpected"))
        .andExpect(status().isInternalServerError())
        .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
        .andExpect(
            jsonPath("$.detail").value("Não foi possível concluir a operação. Tente novamente."))
        .andExpect(jsonPath("$.requestId").isNotEmpty())
        .andExpect(content().string(not(containsString("Detalhe interno"))));
  }
}
