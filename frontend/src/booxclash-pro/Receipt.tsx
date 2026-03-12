import { Page, Text, View, Document, Image, StyleSheet, Font } from '@react-pdf/renderer';

// Register Helvetica-Bold for professional appearance
// Note: This requires an internet connection to fetch the font. 
// If offline, it might fallback or error.
try {
  Font.register({ 
    family: 'Helvetica-Bold', 
    src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyCg4TY17.ttf' 
  });
} catch (e) {
  console.warn("Could not register font, falling back to standard.");
}

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Helvetica', 
    fontSize: 10, 
    color: '#333',
    lineHeight: 1.4
  },
  
  // --- HEADER SECTION ---
  headerContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  logoSection: { 
    width: 130, 
    height: 70, 
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  companySection: { 
    textAlign: 'right', 
    marginTop: 5
  },
  companyName: { 
    fontSize: 13, 
    fontFamily: 'Helvetica-Bold', 
    textTransform: 'uppercase',
    color: '#000',
    marginBottom: 2
  },
  companyAddress: { 
    fontSize: 9, 
    color: '#444' 
  },
  companyTPIN: { 
    fontSize: 9, 
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    color: '#000'
  },
  
  // --- ACCENT DIVIDER ---
  divider: { 
    borderBottomWidth: 2, 
    borderBottomColor: '#059669', // Emerald Green
    marginBottom: 25,
    marginTop: 10
  },

  // --- RECEIPT META ---
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 25
  },
  receiptTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    letterSpacing: 1
  },
  metaDetails: {
    textAlign: 'right',
    fontSize: 9,
    color: '#555'
  },

  // --- BILL TO SECTION ---
  billToContainer: { 
    marginBottom: 25,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    backgroundColor: '#f8fafc'
  },
  billTitle: { 
    fontSize: 10, 
    fontFamily: 'Helvetica-Bold', 
    marginBottom: 5,
    color: '#64748b',
    textTransform: 'uppercase'
  },
  
  // --- TABLE STYLES ---
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#059669', 
    padding: 10,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase'
  },
  tableRow: { 
    flexDirection: 'row', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  colDesc: { width: '75%' },
  colAmount: { width: '25%', textAlign: 'right' },

  // --- TOTALS ---
  totalSection: { 
    marginTop: 15, 
    alignItems: 'flex-end',
    paddingRight: 10
  },
  totalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    width: 180,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#000'
  },
  totalLabel: { 
    fontSize: 11, 
    fontFamily: 'Helvetica-Bold' 
  },
  totalValue: { 
    fontSize: 14, 
    fontFamily: 'Helvetica-Bold',
    color: '#059669'
  },

  // --- FOOTER & SIGNATURE ---
  footer: { 
    position: 'absolute', 
    bottom: 40, 
    left: 40, 
    right: 40 
  },
  signatureSection: { 
    alignItems: 'flex-end', 
    marginBottom: 35 
  },
  signatureImage: {
    width: 110,
    height: 55,
    objectFit: 'contain',
    marginBottom: -10
  },
  signatureLine: { 
    width: 160, 
    borderBottomWidth: 1, 
    borderColor: '#334155', 
    marginTop: 5, 
    marginBottom: 4 
  },
  thankYou: { 
    fontSize: 10, 
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    marginBottom: 6
  },
  autoGen: { 
    fontSize: 8, 
    textAlign: 'center', 
    color: '#94a3b8' 
  }
});

// ✅ THIS INTERFACE MUST MATCH ADMIN DASHBOARD EXACTLY
export interface ReceiptProps {
  data: {
    receipt_no: string;
    date: string;
    user_name: string; // Not school_name
    user_uid: string;  // Required
    plan_name: string;
    credits: number;
    amount: number;
  }
}

// Fallback logic for images
const LOGO_PATH = "/images/logo.png"; 
const SIGNATURE_PATH = "/images/signature.png"; 
// Note: Ensure these images exist in your public/images folder!

export const ReceiptDocument = ({ data }: ReceiptProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.logoSection}>
           {/* Ensure this path exists or PDF will break */}
           <Image src={LOGO_PATH} style={styles.logo} />
        </View>
        <View style={styles.companySection}>
            <Text style={styles.companyName}>BOOXCLASH LEARN LIMITED</Text>
            <Text style={styles.companyAddress}>House No. 2245, Mungule Village</Text>
            <Text style={styles.companyAddress}>Chibombo, Central Province, Zambia</Text>
            <Text style={styles.companyTPIN}>TPIN: 2003813268</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* META */}
      <View style={styles.metaContainer}>
        <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
        <View style={styles.metaDetails}>
            <Text style={{fontFamily: 'Helvetica-Bold', color: '#000'}}>Date: {data.date}</Text>
            <Text>Receipt #: {data.receipt_no}</Text>
        </View>
      </View>

      {/* BILL TO */}
      <View style={styles.billToContainer}>
        <Text style={styles.billTitle}>Bill To</Text>
        <Text style={{fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#000'}}>{data.user_name}</Text>
        <Text style={{color: '#64748b', marginTop: 2}}>User ID: {data.user_uid}</Text>
      </View>

      {/* TABLE */}
      <View style={styles.tableHeader}>
        <View style={styles.colDesc}>
             <Text style={styles.tableHeaderText}>Description</Text>
        </View>
        <View style={styles.colAmount}>
            <Text style={styles.tableHeaderText}>Amount (ZMW)</Text>
        </View>
      </View>

      <View style={styles.tableRow}>
        <View style={styles.colDesc}>
            <Text style={{fontFamily: 'Helvetica-Bold'}}>{data.plan_name}</Text>
            <Text style={{fontSize: 8, color: '#64748b', marginTop: 3}}>
                Allocated {data.credits} Credits to user wallet.
            </Text>
        </View>
        <View style={styles.colAmount}>
            <Text style={{fontFamily: 'Helvetica-Bold'}}>K{data.amount}.00</Text>
        </View>
      </View>

      {/* TOTALS */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL PAID</Text>
            <Text style={styles.totalValue}>K{data.amount}.00</Text>
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.signatureSection}>
            <Image src={SIGNATURE_PATH} style={styles.signatureImage} />
            <View style={styles.signatureLine} />
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>Chilongo Kondwani</Text>
            <Text style={{ fontSize: 9, color: '#64748b' }}>Chief Executive Officer</Text>
        </View>
        
        <Text style={styles.thankYou}>Thank you for choosing Booxclash Learn!</Text>
        <Text style={styles.autoGen}>
            This is a computer-generated receipt. No physical signature is required.
        </Text>
      </View>
    </Page>
  </Document>
);