package com.example

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    // Explicitly lock game to landscape orientation as requested
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

    // Keep screen awake during gameplay
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    // Immersive sticky full-screen mode: hides system status and navigation bars
    hideSystemBars()

    setContent {
      MyApplicationTheme {
        Box(
          modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050811))
            .testTag("game_screen")
        ) {
          OtukenGameWebView(
            modifier = Modifier.fillMaxSize()
          )
        }
      }
    }
  }

  override fun onResume() {
    super.onResume()
    hideSystemBars()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      hideSystemBars()
    }
  }

  private fun hideSystemBars() {
    val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
    windowInsetsController.systemBarsBehavior =
      WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun OtukenGameWebView(modifier: Modifier = Modifier) {
  val context = LocalContext.current
  val webView = remember {
    WebView(context).apply {
      setLayerType(View.LAYER_TYPE_HARDWARE, null)
      isFocusable = true
      isFocusableInTouchMode = true

      settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        databaseEnabled = true
        allowFileAccess = true
        allowContentAccess = true
        allowFileAccessFromFileURLs = true
        allowUniversalAccessFromFileURLs = true
        mediaPlaybackRequiresUserGesture = false
        loadWithOverviewMode = true
        useWideViewPort = true
        setRenderPriority(WebSettings.RenderPriority.HIGH)
        cacheMode = WebSettings.LOAD_NO_CACHE
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
          safeBrowsingEnabled = false
        }
      }

      // Configure modern Android WebViewAssetLoader to serve assets over https://appassets.androidplatform.net
      // This solves ES module CORS restrictions and enables seamless WebGL2 on Android
      val assetLoader = WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
        .build()

      webChromeClient = object : WebChromeClient() {
        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
          consoleMessage?.let {
            Log.d("OtukenEngine", "[${it.messageLevel()}] ${it.message()} (${it.sourceId()}:${it.lineNumber()})")
          }
          return true
        }
      }

      webViewClient = object : WebViewClient() {
        override fun shouldInterceptRequest(
          view: WebView?,
          request: WebResourceRequest?
        ): WebResourceResponse? {
          val url = request?.url ?: return null
          val intercepted = assetLoader.shouldInterceptRequest(url)
          if (intercepted != null) return intercepted

          // Intercept virtual domain requests so Chromium never hits DNS with ERR_NAME_NOT_RESOLVED
          if (url.host == "appassets.androidplatform.net") {
            return WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null)
          }

          return super.shouldInterceptRequest(view, request)
        }

        override fun onReceivedError(
          view: WebView?,
          request: WebResourceRequest?,
          error: WebResourceError?
        ) {
          super.onReceivedError(view, request, error)
          Log.e("OtukenEngine", "WebResourceError: ${error?.description}")
        }
      }

      // Load via the secure appassets domain so ES modules and WebGL work without CORS restrictions
      loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
    }
  }

  DisposableEffect(webView) {
    onDispose {
      webView.stopLoading()
      webView.destroy()
    }
  }

  AndroidView(
    factory = { webView },
    modifier = modifier.testTag("otuken_web_engine")
  )
}
