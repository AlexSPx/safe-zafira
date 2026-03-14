package com.zafira.safe_zafira.telemetry.speed;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Locale;

@Service
public class SpeedLimitService
{

	private final RestClient restClient;
	private final ObjectMapper objectMapper;

	public SpeedLimitService(ObjectMapper objectMapper)
	{
		this.restClient = RestClient.create("https://overpass-api.de/api");
		this.objectMapper = objectMapper;
	}

	public Integer getSpeedLimit(double lat, double lon)
	{
		String query = String.format(Locale.US,
									 "[out:json];way(around:30, %f, %f)[\"maxspeed\"];out tags;", lat, lon
									);

		try
		{
			String response = restClient.get()
										.uri(uriBuilder -> uriBuilder
												.path("/interpreter")
												.queryParam("data", query)
												.build())
										.retrieve()
										.body(String.class);

			JsonNode root = objectMapper.readTree(response);
			JsonNode elements = root.path("elements");

			if (elements.isArray() && !elements.isEmpty())
			{
				String maxSpeedRaw = elements.get(0).path("tags").path("maxspeed").asText();

				return Integer.parseInt(maxSpeedRaw.replaceAll("[^0-9]", ""));
			}
		}
		catch (Exception e)
		{
			System.err.println("Overpass API failed or parsing error: " + e.getMessage());
		}
		return null;
	}
}
