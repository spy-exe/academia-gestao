package br.com.academia.shared;

import java.time.*;
import org.springframework.boot.autoconfigure.validation.ValidationConfigurationCustomizer;
import org.springframework.context.annotation.*;

@Configuration
public class DomainTime {
  @Bean
  public Clock domainClock() {
    return Clock.system(ZoneId.of("America/Sao_Paulo"));
  }

  @Bean
  public ValidationConfigurationCustomizer validationClock(Clock clock) {
    return configuration -> configuration.clockProvider(() -> clock);
  }
}
