import { createClient } from "@/lib/supabase/server";
import { AddPlateDialog } from "./add-plate-dialog";
import { PlateList } from "./plate-list";

interface ExistingPlate {
  id: number;
  plaka: string;
  oran_nakit: number;
  oran_kredi: number;
  aciklama: string | null;
  aktif: boolean;
  created_at: string;
}

async function getPlates(): Promise<ExistingPlate[]> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('iskonto_listesi')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plates:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching plates:', err);
    return [];
  }
}

export async function PlateManagement() {
  const initialPlates = await getPlates();

  return (
    <div className="space-y-6">
      <AddPlateDialog />
      <PlateList initialPlates={initialPlates} />
    </div>
  );
}
