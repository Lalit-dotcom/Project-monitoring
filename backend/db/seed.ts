import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const rawData = `HEADER_ID	PROJECT_ID	PRJ_MGR_ID	PROJECT_CD	PRJ_NM	CUSTOMER_NAME	PRJ_BUDGET_NO	AMOUNT_RECEIVED	NO_OF_PO	PO_AMOUNT	NO_OF_INV_BILLDESK	NO_OF_EXP_INVOCIE	TOTAL_INVOICE_AMOUNT	TOTAL_AMOUNT_PAID	NO_OF_TAX_INVOICE	TOTAL_TAX_INVOCIE_AMOUNT	PROJECT_ABP	CREATED_ON	CUST_ID	PRJ_TYPE	USER_EMAIL	MOBILE_NUMBER	HOD_EMAIL	NIC_CORD_EMAILID	STAFF_EMAIL_ID
1069112	46907	1626	P250902ZOND	Hotel Corporation of India Limited	Hotel Corporation of India Limited	178416	178511	1	166722.58	5	2	21727	21727	2	23612.41	154898	29-JUN-26	2191609	ZO	cfo.hci@centaurhotels.com,it.loinges@centaurhotels.com			hod-email@nic.in	pdml-nicsi@nic.in
1069396	46609	1626	S250608ZOGJ	"Gati Shakti Vishwavidyalaya	"	Gati Shakti Vishwavidyalaya	164291	164291	1	155626.78	0	0	0	0	0	0	164291	29-JUN-26	2250979	ZO	registrar@gsv.ac.in			registrar@gsv.ac.in	pdml-nicsi@nic.in
1069452	44666	1626	S241084ZOTS	Nuclear Fuel Complex	Nuclear Fuel Complex	1308384	1308554	1	1246080	16	13	162857	162857	13	177010.17	1131536	29-JUN-26	2257992	ZO	dvr@nfc.gov.in				
1069453	44544	1626	S240952ZOUP	Nagar Nigam Varanasi	Nagar Nigam Varanasi	396480	396480	0	0	0	0	0	0	0	0	396480	29-JUN-26	2257697	ZO	nagarnigamvns@gmail.com			chandrajeet.saini@nic.in,hod-email@nic.in	
1069458	45012	1626	S241426ZOUP	ADVANCED WEAPONS AND EQUIPMENT INDIA LIMITED	ADVANCED WEAPONS AND EQUIPMENT INDIA LIMITED	532274	532282	3	505146.58	9	9	126835	126835	9	137860.73	394420	29-JUN-26	2258065	ZO	rakeshchaudhary.ofd@nic.in				
1069459	44606	1626	S241015ZOUP	Orai Development Authority, Orai	Orai Development Authority, Orai	36860	36860	0	0	0	0	0	0	0	0	36860	29-JUN-26	2259226	ZO	er.sksingh1965@gmail.com				
1069150	45668	1626	C242073ZOND	AI Engineering Services Limited	AI Engineering Services Limited	6807016.44	5768658	1	6410840.88	0	0	0	0	0	0	5768658	29-JUN-26	2200602	ZO	surendra.behal@aiesl.in			surendra.behal@aiesl.in	paor-nicsi@nic.in
1069168	46593	1626	S250593ZOMH	Jawaharlal Nehru Port Authority	Jawaharlal Nehru Port Authority	3062808	3064509	1	2771112	6	3	471337	471337	3	512273.24	2552237	29-JUN-26	2207633	ZO	suhaskamtikar@jnport.gov.in		hod-email@nic.in		
1069182	45912	1626	S242312ZOPB	Sardar Swaran Singh National Institute of Bio-Energy	Sardar Swaran Singh National Institute of Bio-Energy	163548	163606	1	155760	9	6	34333	34333	6	37313.72	126293	29-JUN-26	2207969	ZO	vandit@nibe.res.in			vandit@nibe.res.in	paor-nicsi@nic.in
1069183	47782	1626	S251768ZOUP	Uttar Pradesh University of Medical Sciences	Uttar Pradesh University of Medical Sciences	1561140	1561140	1	1486800	1	0	0	0	0	0	1561140	29-JUN-26	2208101	ZO	rajeshbasnet@gamil.com			hod-email@nic.in	pdml-nicsi@nic.in
1069197	46844	1626	S250841ZOWB	"MADHYAMGRAM MUNICIPALITY	"	MADHYAMGRAM MUNICIPALITY	63189	62118	1	57915.17	0	0	0	0	0	0	62118	29-JUN-26	2213776	ZO	supriya.adhikari@bangla.gov.in		hog-email@nic.in	hod-email@nic.in	pdml-nicsi@nic.in
1069198	46845	1626	S250851ZOWB	FALAKATA MUNICIPALITY	FALAKATA MUNICIPALITY	63189	63189	1	60180	0	0	0	0	0	0	63189	29-JUN-26	2213966	ZO	supriya.adhikari@bangla.gov.in		oic-mmd@nic.gov.in		pdml-nicsi@nic.in
1069262	46090	1626	C250097ZOND	Pharmaceuticals & Medical Devices Bureau of India	Pharmaceuticals & Medical Devices Bureau of India	1561140	1561880	1	956370.97	10	7	468999	468999	7	509727.41	1052155	29-JUN-26	2224170	ZO	it@janaushadhi.gov.in			it@janaushadhi.gov.in	pdml-nicsi@nic.in
1069332	46706	1626	C250704ZOND	"Centre for Development of Telematics (C-DOT)	"	Centre for Development of Telematics (C-DOT)	1899387	1899387	2	3598429.03	1	1	5970	5970	1	6489.88	1892897	29-JUN-26	2241539	ZO	trilok@cdot.in			hod-email@gov.in	pdml-nicsi@gov.in
1069053	48660	1626	S260172ZOAP	Sri Venkateswara Veterinary University, Tirupati	Sri Venkateswara Veterinary University, Tirupati	626835	626835	1	596985.6	0	0	0	0	0	0	626835	29-JUN-26	2176614	ZO	tovcsvvu@gmail.com,dataproc@svvu.edu.in		hod-email@nic.in		pdml-nicsi@nic.in
1069057	45944	1626	S242344ZOWB	Garden Reach Shipbuilders & Engineers Limited (GRSE)	Garden Reach Shipbuilders & Engineers Limited (GRSE)	735966	736418	1	640625.81	10	7	319528	319528	7	347278.03	389140	29-JUN-26	2176735	ZO	Maji.Subhas@grse.in			Maji.Subhas@grse.in	pdml-nicsi@nic.in
1069082	46912	1626	S250907ZOWB	"Siliguri Municipal Corporation	"	Siliguri Municipal Corporation	432213	388259	0	0	0	0	0	0	0	0	388259	29-JUN-26	2182759	ZO					
1068940	47513	1626	S251501ZOHR	Arun Jaitley National Institute of Financial Management	Arun Jaitley National Institute of Financial Management	297360	297418	1	264320	4	1	13121	13121	1	14260.48	283158	29-JUN-26	2160334	ZO	cao@nifm.ac.in			hod-email@nic.in	pdml-nicsi@nic.in
1068957	44520	1626	S241018ZOUP	State Urban Development Agency, Uttar Pradesh	State Urban Development Agency, Uttar Pradesh	198240	198240	0	0	0	0	0	0	0	0	198240	29-JUN-26	2161457	ZO	kirtiprakashbharti@gmail.com				
1068983	47434	1626	C251422ZOND	"National Capital Region Planning Board	"	National Capital Region Planning Board	185850	185850	2	172653.67	3	0	0	0	0	0	185850	29-JUN-26	2166625	ZO	ncrpb-dr@nic.in			hod-email@nic.in	pdml-nicsi@nic.in
1069002	45813	1626	S242216ZOUP	Artificial Limbs Manufacturing Corporation of India (ALIMCO)	Artificial Limbs Manufacturing Corporation of India (ALIMCO)	1115100	1115792	1	1062000	12	9	619348	619348	9	673134.98	442654	29-JUN-26	2169320	ZO	ankur.katiyar@alimco.in			ankur.katiyar@alimco.in	paor-nicsi@nic.in
1069021	47431	1626	P251419ZOMH	"Certification Engineers International Limited	"	Certification Engineers International Limited	433700	433700	1	407310.44	4	0	0	0	0	0	433700	29-JUN-26	2173782	ZO	rajiv.ranjan@ceil.co.in				pdml-nicsi@nic.in
1069040	47856	1626	S251839ZOMP	UGC-DAE Consortium for Scientific Research	UGC-DAE Consortium for Scientific Research	773136	773136	1	736320	2	0	0	0	0	0	773136	29-JUN-26	2176626	ZO	cd.indore@csr.res.in			hod-email@nic.in	pdml-nicsi@nic.in
1068620	47636	1626	S251624ZODL	Delhi co-operative Housing Finance Corporation Ltd.	Delhi co-operative Housing Finance Corporation Ltd.	23045	23045	1	21358.01	0	0	0	0	0	0	23045	29-JUN-26	2140988	ZO	support@dchfcdelhi.nic.in		hod-email@nic.in		pdml-nicsi@nic.in
1068623	46682	1626	S250680ZOTS	National Mineral Development Corporation	National Mineral Development Corporation	148680	148755	1	136270.97	8	5	24666	24666	5	26811.31	121944	29-JUN-26	2141258	ZO	hsprabhu@nmdc.co.in			hod-email@nic.in	pdml-nicsi@nic.in
1068626	47559	1626	S251546ZOMH	"Maharashtra State Road Transport Corporation	"	Maharashtra State Road Transport Corporation	55606	55594	1	49133.63	1	0	0	0	0	0	55594	29-JUN-26	2141321	ZO	gmtraffic@msrtc.gov.in			hod-email@nic.in	pdml-nicsi@nic.in
1068627	48747	1626	P260261ZOMH	Maharashtra State Mining Corporation Ltd	Maharashtra State Mining Corporation Ltd	22302	22302	1	21240	0	0	0	0	0	0	22302	29-JUN-26	2141248	ZO	jogivilas@rediffmail.com		hod-email@nic.in		pdml-nicsi@nic.in
1068629	47310	1626	S251301ZOMH	MOIL Limited	MOIL Limited	2230200	2230200	1	2078322.58	6	0	0	0	0	0	2230200	29-JUN-26	2141252	ZO	raja@moil.nic.in,ranjeetsingh@moil.nic.in				pdml-nicsi@nic.in
1069196	46910	1626	S250905ZOWB	"MEMARI MUNICIPALITY	"	MEMARI MUNICIPALITY	63189	63189	1	60180	0	0	0	0	0	0	63189	29-JUN-26	2213764	ZO	supriya.adhikari@bangla.gov.in		hog-email@nic.in	hod-email@nic.in	pdml-nicsi@nic.in`;

// Parse date in DD-MON-YY format, e.g. "29-JUN-26" -> "2026-06-29"
const parseDate = (dateStr: string | null): string | null => {
  if (!dateStr || dateStr.trim() === '') return null;
  const cleaned = dateStr.replace(/^"|"$/g, '').trim();
  const parts = cleaned.split('-');
  if (parts.length !== 3) return null;

  const day = parts[0].padStart(2, '0');
  const monthStr = parts[1].toUpperCase();
  let year = parts[2];

  const months: { [key: string]: string } = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
  };

  const month = months[monthStr];
  if (!month) return null;

  if (year.length === 2) {
    const y = parseInt(year, 10);
    year = y < 50 ? `20${year}` : `19${year}`;
  }

  return `${year}-${month}-${day}`;
};

// Parse numeric values (treating blank numeric fields as 0 or NULL)
const parseNumeric = (val: string | null, defaultValue: number | null = null): number | null => {
  if (val === undefined || val === null) return defaultValue;
  const cleaned = val.replace(/^"|"$/g, '').trim();
  if (cleaned === '') return defaultValue;
  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultValue : num;
};

// Clean string fields (removing stray quotes, carriage returns and trailing/leading spaces)
const cleanString = (val: string | null): string | null => {
  if (val === undefined || val === null) return null;
  const cleaned = val.replace(/^"|"$/g, '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned === '' ? null : cleaned;
};

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('Connected to PostgreSQL. Starting ETL...');

  const lines = rawData.trim().split('\n');
  
  let insertedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    let fields = line.split('\t');

    // Handle name rows where the value was split due to tab inside double quotes
    if (fields.length === 26) {
      fields[4] = fields[4] + ' ' + fields[5];
      fields.splice(5, 1);
    }

    if (fields.length !== 25) {
      console.warn(`Warning: Row ${i} has invalid columns count (${fields.length} instead of 25). Skipping.`);
      continue;
    }

    const header_id = parseNumeric(fields[0], null);
    const project_id = parseNumeric(fields[1], null);
    const prj_mgr_id = parseNumeric(fields[2], null);
    const project_cd = cleanString(fields[3]);
    const prj_nm = cleanString(fields[4]);
    const customer_name = cleanString(fields[5]);
    const prj_budget_no = parseNumeric(fields[6], null);
    const amount_received = parseNumeric(fields[7], null);
    
    // Counts default to 0 if blank
    const no_of_po = parseNumeric(fields[8], 0);
    const po_amount = parseNumeric(fields[9], null);
    const no_of_inv_billdesk = parseNumeric(fields[10], 0);
    const no_of_exp_invoice = parseNumeric(fields[11], 0);
    const total_invoice_amount = parseNumeric(fields[12], 0);
    const total_amount_paid = parseNumeric(fields[13], 0);
    const no_of_tax_invoice = parseNumeric(fields[14], 0);
    const total_tax_invoice_amount = parseNumeric(fields[15], 0);
    
    const project_abp = parseNumeric(fields[16], null);
    const created_on = parseDate(fields[17]);
    const cust_id = parseNumeric(fields[18], null);
    const prj_type = cleanString(fields[19]);
    const user_email = cleanString(fields[20]);
    const mobile_number = cleanString(fields[21]);
    const hod_email = cleanString(fields[22]);
    const nic_cord_emailid = cleanString(fields[23]);
    const staff_email_id = cleanString(fields[24]);

    const query = `
      INSERT INTO projects (
        header_id, project_id, prj_mgr_id, project_cd, prj_nm, customer_name,
        prj_budget_no, amount_received, no_of_po, po_amount, no_of_inv_billdesk,
        no_of_exp_invoice, total_invoice_amount, total_amount_paid, no_of_tax_invoice,
        total_tax_invoice_amount, project_abp, created_on, cust_id, prj_type,
        user_email, mobile_number, hod_email, nic_cord_emailid, staff_email_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      )
      ON CONFLICT (project_cd) DO NOTHING;
    `;

    const values = [
      header_id, project_id, prj_mgr_id, project_cd, prj_nm, customer_name,
      prj_budget_no, amount_received, no_of_po, po_amount, no_of_inv_billdesk,
      no_of_exp_invoice, total_invoice_amount, total_amount_paid, no_of_tax_invoice,
      total_tax_invoice_amount, project_abp, created_on, cust_id, prj_type,
      user_email, mobile_number, hod_email, nic_cord_emailid, staff_email_id
    ];

    try {
      await client.query(query, values);
      insertedCount++;
    } catch (err: any) {
      console.error(`Error inserting row ${i}:`, err.message);
    }
  }

  console.log(`ETL Complete. Seeded ${insertedCount} rows.`);
  await client.end();
}

seed().catch(err => {
  console.error('Seeding process encountered an error:', err);
  process.exit(1);
});
