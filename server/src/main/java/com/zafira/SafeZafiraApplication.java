package com.zafira;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(basePackages = "com.zafira")
@EnableJpaRepositories(basePackages = "com.zafira")
@EntityScan(basePackages = "com.zafira")
@EnableScheduling
@EnableCaching
public class SafeZafiraApplication {

	public static void main(String[] args) {
		SpringApplication.run(SafeZafiraApplication.class, args);
	}
}
