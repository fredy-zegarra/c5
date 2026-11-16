import { z } from "zod";
import { BOUNDS, DISTRICTS, STREAM_TYPES } from "./constants";

export const CamBody = z.object({
  name: z.string().trim().min(2).max(120),
  district: z.enum(DISTRICTS).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  lat: z.number().min(BOUNDS.latMin).max(BOUNDS.latMax),
  lng: z.number().min(BOUNDS.lngMin).max(BOUNDS.lngMax),
  stream_url: z.string().max(500).refine((v) => !v || /^https:\/\//.test(v), "debe empezar con https://").nullable().optional(),
  stream_type: z.enum(STREAM_TYPES),
  active: z.boolean(),
});
