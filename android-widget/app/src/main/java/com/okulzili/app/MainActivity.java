package com.okulzili.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.JavascriptInterface;

public class MainActivity extends Activity {
    private WebView web;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                String js = "(function(){"
                    + "var s=localStorage.getItem('danisment_schedule_data');"
                    + "if(!s){"
                    + "var t=["
                    + "{id:1,type:'ders',title:'1. Ders',start:'08:40',end:'09:20'},"
                    + "{id:2,type:'teneffus',title:'Teneffüs',start:'09:20',end:'09:35'},"
                    + "{id:3,type:'ders',title:'2. Ders',start:'09:35',end:'10:15'},"
                    + "{id:4,type:'teneffus',title:'Teneffüs',start:'10:15',end:'10:30'},"
                    + "{id:5,type:'ders',title:'3. Ders',start:'10:30',end:'11:10'},"
                    + "{id:6,type:'teneffus',title:'Teneffüs',start:'11:10',end:'11:25'},"
                    + "{id:7,type:'ders',title:'4. Ders',start:'11:25',end:'12:05'},"
                    + "{id:8,type:'ogle',title:'Öğle Arası',start:'12:05',end:'12:55'},"
                    + "{id:9,type:'ders',title:'5. Ders',start:'12:55',end:'13:35'},"
                    + "{id:10,type:'teneffus',title:'Teneffüs',start:'13:35',end:'13:45'},"
                    + "{id:11,type:'ders',title:'6. Ders',start:'13:45',end:'14:25'},"
                    + "{id:12,type:'teneffus',title:'Teneffüs',start:'14:25',end:'14:35'},"
                    + "{id:13,type:'ders',title:'7. Ders',start:'14:35',end:'15:15'}];"
                    + "s=JSON.stringify({Pazartesi:t,Salı:t,Çarşamba:t,Perşembe:t,Cuma:t});"
                    + "localStorage.setItem('danisment_schedule_data',s);"
                    + "}"
                    + "if(window.SchoolBellWidget)window.SchoolBellWidget.updateSchedule(s);"
                    + "})();";
                view.evaluateJavascript(js, null);
            }
        });
        web.addJavascriptInterface(new WidgetBridge(), "SchoolBellWidget");
        web.loadUrl("https://okul-zili-pwa.onrender.com/");
    }
    private class WidgetBridge {
        @JavascriptInterface public void updateSchedule(String json) {
            getSharedPreferences("school_widget", MODE_PRIVATE).edit().putString("schedule", json).apply();
            runOnUiThread(() -> SchoolBellWidgetProvider.updateAll(MainActivity.this));
        }
    }
    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
