import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from("listings")
    .select("id, title, images, panorama_image")
    .is("panorama_image", null);

  if (error) {
    throw error;
  }

  const candidates = (data ?? []).filter((listing) => Array.isArray(listing.images) && listing.images.length > 0);
  let updated = 0;

  for (const listing of candidates) {
    const firstImage = String(listing.images[0]);
    const { error: updateError } = await supabase
      .from("listings")
      .update({ panorama_image: firstImage })
      .eq("id", listing.id);

    if (updateError) {
      throw updateError;
    }
    updated += 1;
  }

  console.log(
    JSON.stringify({
      success: true,
      listingsWithoutPanorama: (data ?? []).length,
      updated,
    }),
  );
}

void main();
