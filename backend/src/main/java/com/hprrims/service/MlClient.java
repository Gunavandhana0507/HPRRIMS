package com.hprrims.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/** HTTP client for the Python ML service. Every failure surfaces as MlUnavailableException. */
@Component
public class MlClient {

    private static final Logger log = LoggerFactory.getLogger(MlClient.class);

    public static class MlUnavailableException extends RuntimeException {
        public MlUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    private final RestClient client;

    public MlClient(@Value("${app.ml.base-url}") String baseUrl,
                    @Value("${app.ml.api-key:}") String apiKey,
                    @Value("${app.ml.connect-timeout-ms}") int connectTimeout,
                    @Value("${app.ml.read-timeout-ms}") int readTimeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        RestClient.Builder builder = RestClient.builder().baseUrl(baseUrl).requestFactory(factory);
        if (apiKey != null && !apiKey.isBlank()) {
            builder.defaultHeader("X-Service-Key", apiKey);
        }
        this.client = builder.build();
    }

    public JsonNode predictReadmission(Map<String, Object> features) {
        return post("/predict/readmission", features);
    }

    public JsonNode predictIcuPriority(Map<String, Object> features) {
        return post("/predict/icu-priority", features);
    }

    public JsonNode models() {
        try {
            return client.get().uri("/models").retrieve().body(JsonNode.class);
        } catch (Exception e) {
            throw new MlUnavailableException("ML service unavailable", e);
        }
    }

    private JsonNode post(String path, Map<String, Object> body) {
        try {
            JsonNode result = client.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body)
                    .retrieve().body(JsonNode.class);
            if (result == null) {
                throw new IllegalStateException("Empty response");
            }
            return result;
        } catch (Exception e) {
            log.warn("ML call {} failed: {}", path, e.getMessage());
            throw new MlUnavailableException("ML service unavailable", e);
        }
    }
}
