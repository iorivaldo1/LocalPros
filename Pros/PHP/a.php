
<?php
/**
 * 获取汉字拼音首字母（基于GB2312编码范围）
 * @param string $str 输入字符串
 * @return string 首字母或'*'
 */
	function getFirstLetter($str) {
		if(empty($str)) return '';
		
		// 转换为GB2312编码处理
		$char = iconv('UTF-8', 'GB18030//IGNORE', mb_substr($str, 0, 1, 'UTF-8'));
		if(strlen($char) < 2) return strtoupper($char); // 非汉字处理
		
		$asc = ord($char[0]) * 256 + ord($char[1]) - 65536;
		
		// 拼音首字母区间判断
		if($asc >= -20319 && $asc <= -20284) return 'A';
		if($asc >= -20283 && $asc <= -19776) return 'B';
		if($asc >= -19775 && $asc <= -19219) return 'C';
		if($asc >= -19218 && $asc <= -18711) return 'D';
		if($asc >= -18710 && $asc <= -18527) return 'E';
		if($asc >= -18526 && $asc <= -18240) return 'F';
		if($asc >= -18239 && $asc <= -17923) return 'G';
		if($asc >= -17922 && $asc <= -17418) return 'H';
		if($asc >= -17417 && $asc <= -16475) return 'J';
		if($asc >= -16474 && $asc <= -16213) return 'K';
		if($asc >= -16212 && $asc <= -15641) return 'L';
		if($asc >= -15640 && $asc <= -15166) return 'M';
		if($asc >= -15165 && $asc <= -14923) return 'N';
		if($asc >= -14922 && $asc <= -14915) return 'O';
		if($asc >= -14914 && $asc <= -14631) return 'P';
		if($asc >= -14630 && $asc <= -14150) return 'Q';
		if($asc >= -14149 && $asc <= -14091) return 'R';
		if($asc >= -14090 && $asc <= -13319) return 'S';
		if($asc >= -13318 && $asc <= -12839) return 'T';
		if($asc >= -12838 && $asc <= -12557) return 'W';
		if($asc >= -12556 && $asc <= -11848) return 'X';
		if($asc >= -11847 && $asc <= -11056) return 'Y';
		if($asc >= -11055 && $asc <= -10247) return 'Z';
		if($asc >= -7489 && $asc <= -7458) return 'Y';
		return '*';
	}
echo getFirstLetter('荥');
echo getFirstLetter('载');


// // 测试用例
// $testCases = [
//     '中' => 'Z',   // 中文
//     'a'  => 'A',   // 英文
//     '1'  => '*',   // 数字
//     ' '  => '',    // 空格
//     '北京' => 'B',  // 多字取首字
//     '😊' => '*'    // 特殊符号
// ];

// echo "测试结果：\n";
// foreach($testCases as $input => $expected) {
//     $result = getFirstLetter($input);
//     $status = $result === $expected ? '✓' : '✗';
//     echo sprintf("%-5s => %-2s (预期:%-2s) %s\n", 
//         $input, $result, $expected, $status);
// }

// // 交互测试模式
// if(PHP_SAPI === 'cli') {
//     while(true) {
//         echo "\n输入测试文字(输入q退出): ";
//         $input = trim(fgets(STDIN));
//         if(strtolower($input) === 'q') break;
//         echo "结果: ".getFirstLetter($input)."\n";
//     }
// }
