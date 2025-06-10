import FlutterView from "./FlutterView";

export default function EmbeddedFeaturePage() {
    // The public URL of your live Flutter web app
    const flutterAppUrl = 'https://vendor.golverd.com';

    return (
        <div style={{ height: '80vh', marginTop: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            <FlutterView src={flutterAppUrl} />
        </div>
    );
}