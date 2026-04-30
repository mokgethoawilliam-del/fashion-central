const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pipxmnjlgqyakatzdsza.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcHhtbmpsZ3F5YWthdHpkc3phIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg5MTk1OCwiZXhwIjoyMDg4NDY3OTU4fQ.8u-TJT5Vz658eXNgiVR4FdfgVNfR70nLEabdZ8X7aHI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updateSlug() {
    console.log('--- Updating Vendor Slug ---');
    
    // 1. Find the vendor by current slug or name
    const { data: vendors, error: findErr } = await supabase
        .from('vendors')
        .select('id, name, slug')
        .or('slug.eq.fabris-eaters,slug.eq.fabri-eaters');

    if (findErr || !vendors || vendors.length === 0) {
        console.log('Could not find vendor by slug. Trying name search...');
        const { data: vendorByName } = await supabase
            .from('vendors')
            .select('id, name, slug')
            .ilike('name', '%Chef Dips%')
            .single();
        
        if (vendorByName) {
            console.log(`Found vendor by name: ${vendorByName.name} (${vendorByName.id}) with current slug: ${vendorByName.slug}`);
            await performUpdate(vendorByName.id);
        } else {
            console.error('Could not find vendor by name either.');
        }
        return;
    }

    const vendor = vendors[0];
    console.log(`Found vendor: ${vendor.name} (${vendor.id}) current slug: ${vendor.slug}`);
    await performUpdate(vendor.id);
}

async function performUpdate(id) {
    // 2. Update the slug
    const { error: updateErr } = await supabase
        .from('vendors')
        .update({ slug: 'chef-dips' })
        .eq('id', id);

    if (updateErr) {
        console.error('Error updating slug:', updateErr);
        return;
    }

    console.log('SUCCESS: Slug updated to "chef-dips"');
    console.log(`New URL: https://kota-guard.vercel.app/v/chef-dips`);
}

updateSlug();
